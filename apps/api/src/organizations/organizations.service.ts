import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ProfessionalStatus, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { isSerializationFailureError } from '../common/prisma-error.util';
import { normalizeAccountEmail } from '../auth/organization-slug';
import { ListTeamMembersDto } from './dto/list-team-members.dto';
import { UpdateTeamMemberRoleDto } from './dto/update-team-member-role.dto';
import { RevokeTeamMemberAccessDto } from './dto/revoke-team-member-access.dto';

const TEAM_ROLES = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.BARBER,
  UserRole.RECEPTIONIST,
] as const;

const TEAM_MEMBER_SELECT = {
  id: true,
  userId: true,
  role: true,
  createdAt: true,
  user: {
    select: {
      name: true,
      email: true,
    },
  },
} satisfies Prisma.MembershipSelect;

type TeamMemberRecord = Prisma.MembershipGetPayload<{
  select: typeof TEAM_MEMBER_SELECT;
}>;

type TeamProfessionalProjection = {
  name: string;
  status: ProfessionalStatus;
} | null;

type TeamManagerRole = (typeof UserRole)['OWNER' | 'ADMIN'];

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // 🔒 Multi-tenancy: Buscar únicamente la organización asociada al token
  async findMine(organizationId: string) {
    return await this.prisma.db.organization.findUnique({
      where: { id: organizationId },
    });
  }

  // 🔒 Lista el equipo consultando Membership (no User directamente —
  // desde la identidad global, User ya no tiene organizationId propio).
  // select explícito en `user`, nunca spread: así password queda
  // excluido por construcción, no por un omit que alguien podría olvidar
  // mantener si el modelo User gana campos sensibles en el futuro.
  async findMembers(organizationId: string) {
    const memberships = await this.prisma.db.membership.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const userIds = memberships.map((membership) => membership.user.id);
    const professionals =
      userIds.length === 0
        ? []
        : await this.prisma.db.professional.findMany({
            where: { organizationId, userId: { in: userIds } },
            select: {
              id: true,
              userId: true,
              name: true,
              bio: true,
              avatar: true,
              specialty: true,
              experienceYears: true,
              status: true,
              isPublic: true,
            },
          });
    const professionalByUserId = new Map(
      professionals.flatMap((professional) =>
        professional.userId ? [[professional.userId, professional]] : [],
      ),
    );

    return memberships.map((membership) => {
      const professional = professionalByUserId.get(membership.user.id);
      return {
        membershipId: membership.id,
        role: membership.role,
        memberSince: membership.createdAt,
        user: {
          ...membership.user,
          professional: professional
            ? {
                id: professional.id,
                name: professional.name,
                bio: professional.bio,
                avatar: professional.avatar,
                specialty: professional.specialty,
                experienceYears: professional.experienceYears,
                status: professional.status,
                isActive: professional.status === ProfessionalStatus.ACTIVE,
                isPublic: professional.isPublic,
              }
            : null,
        },
      };
    });
  }

  /**
   * Contrato de Equipo. Se mantiene separado de `findMembers`, cuyo payload
   * con IDs sostiene el vínculo administrativo existente de Profesionales.
   * Esta proyección no revela identificadores internos ni datos privados.
   */
  async findTeamMembers(organizationId: string, query: ListTeamMembersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.MembershipWhereInput = {
      organizationId,
      role: { in: [...TEAM_ROLES] },
    };
    const [memberships, total] = await this.prisma.db.$transaction([
      this.prisma.db.membership.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: TEAM_MEMBER_SELECT,
      }),
      this.prisma.db.membership.count({ where }),
    ]);

    const professionalByUserId = await this.findTeamProfessionals(
      this.prisma.db,
      organizationId,
      memberships.map((membership) => membership.userId),
    );

    return {
      items: memberships.map((membership) =>
        this.projectTeamMember(
          membership,
          professionalByUserId.get(membership.userId) ?? null,
        ),
      ),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateTeamMemberRole(
    organizationId: string,
    actorUserId: string,
    dto: UpdateTeamMemberRoleDto,
  ) {
    const email = normalizeAccountEmail(dto.email);

    return this.runTeamMutation(async (tx) => {
      await this.lockOrganization(tx, organizationId);
      const actorRole = await this.resolveManagerRole(
        tx,
        organizationId,
        actorUserId,
      );
      const target = await this.findManagedMember(tx, organizationId, email);
      if (!target) throw new NotFoundException('Miembro no disponible');

      this.assertCanManageTarget(actorRole, target.role);
      if (target.role === dto.role) {
        return this.projectTeamMember(
          target,
          await this.findTeamProfessional(tx, organizationId, target.userId),
        );
      }
      if (target.role === UserRole.OWNER) {
        await this.assertAnotherOwnerExists(tx, organizationId);
      }

      const updated = await tx.membership.update({
        where: { id: target.id },
        data: { role: dto.role },
        select: TEAM_MEMBER_SELECT,
      });
      await this.audit.logTransactional(
        {
          organizationId,
          userId: actorUserId,
          action: 'UPDATE_ROLE',
          entity: 'Membership',
          entityId: updated.id,
        },
        tx,
      );

      return this.projectTeamMember(
        updated,
        await this.findTeamProfessional(tx, organizationId, updated.userId),
      );
    });
  }

  async revokeTeamMemberAccess(
    organizationId: string,
    actorUserId: string,
    dto: RevokeTeamMemberAccessDto,
  ): Promise<void> {
    const email = normalizeAccountEmail(dto.email);

    await this.runTeamMutation(async (tx) => {
      await this.lockOrganization(tx, organizationId);
      const actorRole = await this.resolveManagerRole(
        tx,
        organizationId,
        actorUserId,
      );
      const target = await this.findManagedMember(tx, organizationId, email);

      // Revocar un acceso ya ausente es idempotente y no revela si el correo
      // pertenece a otro tenant o no existe.
      if (!target) return;

      this.assertCanManageTarget(actorRole, target.role);
      if (target.role === UserRole.OWNER) {
        await this.assertAnotherOwnerExists(tx, organizationId);
      }

      await tx.membership.delete({ where: { id: target.id } });
      await this.audit.logTransactional(
        {
          organizationId,
          userId: actorUserId,
          action: 'REVOKE_ACCESS',
          entity: 'Membership',
          entityId: target.id,
        },
        tx,
      );
    });
  }

  private projectTeamMember(
    membership: TeamMemberRecord,
    professional: TeamProfessionalProjection,
  ) {
    return {
      name: membership.user.name,
      email: membership.user.email,
      role: membership.role,
      accessStatus: 'ACTIVE' as const,
      professional,
    };
  }

  private async findTeamProfessionals(
    client: Prisma.TransactionClient | PrismaService['db'],
    organizationId: string,
    userIds: string[],
  ): Promise<Map<string, Exclude<TeamProfessionalProjection, null>>> {
    if (userIds.length === 0) return new Map();

    const professionals = await client.professional.findMany({
      where: { organizationId, userId: { in: userIds } },
      select: { userId: true, name: true, status: true },
    });
    return new Map(
      professionals.flatMap((professional) =>
        professional.userId
          ? [
              [
                professional.userId,
                { name: professional.name, status: professional.status },
              ] as const,
            ]
          : [],
      ),
    );
  }

  private async findTeamProfessional(
    tx: Prisma.TransactionClient,
    organizationId: string,
    userId: string,
  ): Promise<TeamProfessionalProjection> {
    return tx.professional.findFirst({
      where: { organizationId, userId },
      select: { name: true, status: true },
    });
  }

  private async findManagedMember(
    tx: Prisma.TransactionClient,
    organizationId: string,
    email: string,
  ): Promise<TeamMemberRecord | null> {
    return tx.membership.findFirst({
      where: {
        organizationId,
        role: { in: [...TEAM_ROLES] },
        user: { email },
      },
      select: TEAM_MEMBER_SELECT,
    });
  }

  private async resolveManagerRole(
    tx: Prisma.TransactionClient,
    organizationId: string,
    actorUserId: string,
  ): Promise<TeamManagerRole> {
    const membership = await tx.membership.findUnique({
      where: {
        userId_organizationId: { userId: actorUserId, organizationId },
      },
      select: { role: true },
    });
    if (
      membership?.role !== UserRole.OWNER &&
      membership?.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('No tienes permiso para gestionar Equipo');
    }
    return membership.role;
  }

  private assertCanManageTarget(
    actorRole: TeamManagerRole,
    targetRole: UserRole,
  ): void {
    if (actorRole === UserRole.ADMIN && targetRole === UserRole.OWNER) {
      throw new ForbiddenException(
        'No tienes permiso para modificar este acceso',
      );
    }
  }

  private async assertAnotherOwnerExists(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<void> {
    const owners = await tx.membership.count({
      where: { organizationId, role: UserRole.OWNER },
    });
    if (owners <= 1) {
      throw new ConflictException(
        'La organización debe conservar al menos un OWNER con acceso',
      );
    }
  }

  private async lockOrganization(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<void> {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`,
    );
    if (locked.length !== 1) {
      throw new NotFoundException('Organización no disponible');
    }
  }

  private async runTeamMutation<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.prisma.db.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (isSerializationFailureError(error) && attempt < maxAttempts) {
          continue;
        }
        if (isSerializationFailureError(error)) {
          throw new ConflictException(
            'El equipo cambió al mismo tiempo. Intenta nuevamente.',
          );
        }
        throw error;
      }
    }

    throw new ConflictException(
      'El equipo cambió al mismo tiempo. Intenta nuevamente.',
    );
  }
}
