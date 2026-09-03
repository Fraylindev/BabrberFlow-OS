import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Prisma,
  ProfessionalStatus,
  TeamInvitationStatus,
  UserRole,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import {
  isSerializationFailureError,
  isUniqueConstraintError,
} from '../common/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkSessionVerifierService } from './clerk/clerk-session-verifier.service';
import {
  CLERK_INVITATION_REDIRECT_URL,
  type ClerkInvitationRedirectUrlLoader,
} from './clerk/clerk-auth.providers';
import { CreateTeamInvitationDto } from './dto/create-team-invitation.dto';
import { ListTeamInvitationsDto } from './dto/list-team-invitations.dto';
import { normalizeAccountEmail } from './organization-slug';
import { buildTeamInvitationRedirectUrl } from './team-invitation-redirect';

const INVITATION_SELECT = {
  id: true,
  organizationId: true,
  email: true,
  role: true,
  createPublicProfile: true,
  status: true,
  clerkInvitationId: true,
  invitedByUserId: true,
  acceptedByUserId: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TeamInvitationSelect;

type InvitationRecord = Prisma.TeamInvitationGetPayload<{
  select: typeof INVITATION_SELECT;
}>;

interface VerifiedClerkProfile {
  name: string;
  email: string;
}

interface ClerkUserProfile {
  id?: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  primaryEmailAddressId: string | null;
  emailAddresses?: Array<{
    id: string;
    emailAddress: string;
    verification?: { status?: string | null } | null;
  }>;
}

export interface AcceptTeamInvitationResult {
  isNew: boolean;
  organizationId: string;
  role: UserRole;
  professionalCreated: boolean;
}

const MANAGEMENT_TRANSITIONS = new Set<TeamInvitationStatus>([
  TeamInvitationStatus.PENDING,
  TeamInvitationStatus.EXPIRED,
  TeamInvitationStatus.FAILED,
  TeamInvitationStatus.REVOKED,
]);

const OPEN_INVITATION_STATUSES = [
  TeamInvitationStatus.CREATING,
  TeamInvitationStatus.PENDING,
  TeamInvitationStatus.RESENDING,
  TeamInvitationStatus.REVOKING,
] as const;

@Injectable()
export class TeamInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly verifier: ClerkSessionVerifierService,
    @Inject(CLERK_INVITATION_REDIRECT_URL)
    private readonly loadInvitationRedirectUrl: ClerkInvitationRedirectUrlLoader,
  ) {}

  private project(invitation: InvitationRecord) {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      createPublicProfile: invitation.createPublicProfile,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  }

  private neutralConflict(): ConflictException {
    return new ConflictException(
      'No es posible completar la invitación con los datos proporcionados.',
    );
  }

  private expiresAt(expiresInDays: number): Date {
    return new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  }

  private async expirePending(organizationId?: string): Promise<void> {
    const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
    await this.prisma.db.teamInvitation.updateMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: {
          in: [
            TeamInvitationStatus.CREATING,
            TeamInvitationStatus.RESENDING,
            TeamInvitationStatus.REVOKING,
          ],
        },
        updatedAt: { lte: staleBefore },
      },
      data: { status: TeamInvitationStatus.FAILED },
    });
    await this.prisma.db.teamInvitation.updateMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: TeamInvitationStatus.PENDING,
        expiresAt: { lte: new Date() },
      },
      data: { status: TeamInvitationStatus.EXPIRED },
    });
  }

  private async findManaged(
    organizationId: string,
    invitationId: string,
  ): Promise<InvitationRecord> {
    const invitation = await this.prisma.db.teamInvitation.findFirst({
      where: { id: invitationId, organizationId },
      select: INVITATION_SELECT,
    });
    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }
    return invitation;
  }

  private async findOpenInvitation(
    organizationId: string,
    email: string,
  ): Promise<InvitationRecord | null> {
    return this.prisma.db.teamInvitation.findFirst({
      where: {
        organizationId,
        email,
        status: { in: [...OPEN_INVITATION_STATUSES] },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: INVITATION_SELECT,
    });
  }

  private reuseMatchingOpenInvitation(
    invitation: InvitationRecord | null,
    role: UserRole,
    createPublicProfile: boolean,
  ) {
    if (!invitation) return null;
    if (
      invitation.role !== role ||
      invitation.createPublicProfile !== createPublicProfile
    ) {
      throw this.neutralConflict();
    }
    return this.project(invitation);
  }

  private async createClerkInvitation(
    invitation: InvitationRecord,
    expiresInDays: number,
  ): Promise<string> {
    try {
      const created = await this.verifier
        .getClient()
        .invitations.createInvitation({
          emailAddress: invitation.email,
          expiresInDays,
          ignoreExisting: true,
          notify: true,
          redirectUrl: buildTeamInvitationRedirectUrl(
            this.loadInvitationRedirectUrl(),
            invitation.id,
          ),
        });
      return created.id;
    } catch {
      throw new ServiceUnavailableException(
        'No pudimos enviar la invitación en este momento.',
      );
    }
  }

  private async revokeClerkInvitation(
    clerkInvitationId: string,
  ): Promise<void> {
    try {
      await this.verifier
        .getClient()
        .invitations.revokeInvitation(clerkInvitationId);
    } catch {
      throw new ServiceUnavailableException(
        'No pudimos actualizar la invitación en este momento.',
      );
    }
  }

  private async safeRevokeClerkInvitation(
    clerkInvitationId: string,
  ): Promise<void> {
    try {
      await this.verifier
        .getClient()
        .invitations.revokeInvitation(clerkInvitationId);
    } catch {
      // Compensación best-effort. La fila local queda FAILED para impedir uso.
    }
  }

  private async markFailed(
    invitationId: string,
    expectedStatuses: TeamInvitationStatus[],
  ): Promise<void> {
    try {
      await this.prisma.db.teamInvitation.updateMany({
        where: { id: invitationId, status: { in: expectedStatuses } },
        data: { status: TeamInvitationStatus.FAILED },
      });
    } catch {
      // El estado transitorio conserva el bloqueo y permite reconciliación.
    }
  }

  async create(
    organizationId: string,
    actorUserId: string,
    dto: CreateTeamInvitationDto,
  ) {
    if (dto.createPublicProfile && dto.role !== UserRole.BARBER) {
      throw new BadRequestException(
        'El perfil profesional solo puede crearse para un BARBER.',
      );
    }

    const email = normalizeAccountEmail(dto.email);
    const expiresInDays = dto.expiresInDays ?? 30;
    const createPublicProfile =
      dto.role === UserRole.BARBER && dto.createPublicProfile === true;
    await this.expirePending(organizationId);
    const existing = this.reuseMatchingOpenInvitation(
      await this.findOpenInvitation(organizationId, email),
      dto.role,
      createPublicProfile,
    );
    if (existing) return existing;

    let localInvitation: InvitationRecord;

    try {
      localInvitation = await this.prisma.db.$transaction(async (tx) => {
        const created = await tx.teamInvitation.create({
          data: {
            organizationId,
            email,
            role: dto.role,
            createPublicProfile,
            status: TeamInvitationStatus.CREATING,
            invitedByUserId: actorUserId,
            expiresAt: this.expiresAt(expiresInDays),
          },
          select: INVITATION_SELECT,
        });

        await this.audit.logTransactional(
          {
            organizationId,
            userId: actorUserId,
            action: 'CREATE',
            entity: 'TeamInvitation',
            entityId: created.id,
          },
          tx,
        );
        return created;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const concurrent = this.reuseMatchingOpenInvitation(
          await this.findOpenInvitation(organizationId, email),
          dto.role,
          createPublicProfile,
        );
        if (concurrent) return concurrent;
        throw this.neutralConflict();
      }
      throw error;
    }

    let clerkInvitationId: string;
    try {
      clerkInvitationId = await this.createClerkInvitation(
        localInvitation,
        expiresInDays,
      );
    } catch (error) {
      await this.markFailed(localInvitation.id, [
        TeamInvitationStatus.CREATING,
      ]);
      throw error;
    }

    try {
      const invitation = await this.prisma.db.teamInvitation.update({
        where: { id: localInvitation.id },
        data: {
          clerkInvitationId,
          status: TeamInvitationStatus.PENDING,
        },
        select: INVITATION_SELECT,
      });
      return this.project(invitation);
    } catch {
      await this.safeRevokeClerkInvitation(clerkInvitationId);
      await this.markFailed(localInvitation.id, [
        TeamInvitationStatus.CREATING,
      ]);
      throw new ServiceUnavailableException(
        'No pudimos completar la invitación en este momento.',
      );
    }
  }

  async list(organizationId: string, query: ListTeamInvitationsDto) {
    await this.expirePending(organizationId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.TeamInvitationWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.db.$transaction([
      this.prisma.db.teamInvitation.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: INVITATION_SELECT,
      }),
      this.prisma.db.teamInvitation.count({ where }),
    ]);

    return {
      items: items.map((invitation) => this.project(invitation)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async resend(
    organizationId: string,
    actorUserId: string,
    invitationId: string,
  ) {
    await this.expirePending(organizationId);
    const original = await this.findManaged(organizationId, invitationId);
    if (!MANAGEMENT_TRANSITIONS.has(original.status)) {
      throw this.neutralConflict();
    }

    const reserved = await this.prisma.db.teamInvitation.updateMany({
      where: {
        id: invitationId,
        organizationId,
        status: original.status,
      },
      data: { status: TeamInvitationStatus.RESENDING },
    });
    if (reserved.count !== 1) throw this.neutralConflict();

    try {
      if (
        original.clerkInvitationId &&
        (original.status === TeamInvitationStatus.PENDING ||
          original.status === TeamInvitationStatus.EXPIRED)
      ) {
        await this.revokeClerkInvitation(original.clerkInvitationId);
      } else if (original.clerkInvitationId) {
        await this.safeRevokeClerkInvitation(original.clerkInvitationId);
      }
    } catch (error) {
      await this.prisma.db.teamInvitation.updateMany({
        where: { id: invitationId, status: TeamInvitationStatus.RESENDING },
        data: { status: original.status },
      });
      throw error;
    }

    const expiresInDays = 30;
    let clerkInvitationId: string;
    try {
      clerkInvitationId = await this.createClerkInvitation(
        { ...original, status: TeamInvitationStatus.RESENDING },
        expiresInDays,
      );
    } catch (error) {
      await this.markFailed(invitationId, [TeamInvitationStatus.RESENDING]);
      throw error;
    }

    try {
      const invitation = await this.prisma.db.teamInvitation.update({
        where: { id: invitationId },
        data: {
          clerkInvitationId,
          status: TeamInvitationStatus.PENDING,
          expiresAt: this.expiresAt(expiresInDays),
          revokedAt: null,
        },
        select: INVITATION_SELECT,
      });
      await this.audit.log({
        organizationId,
        userId: actorUserId,
        action: 'RESEND',
        entity: 'TeamInvitation',
        entityId: invitationId,
      });
      return this.project(invitation);
    } catch {
      await this.safeRevokeClerkInvitation(clerkInvitationId);
      await this.markFailed(invitationId, [TeamInvitationStatus.RESENDING]);
      throw new ServiceUnavailableException(
        'No pudimos completar el reenvío en este momento.',
      );
    }
  }

  async revoke(
    organizationId: string,
    actorUserId: string,
    invitationId: string,
  ) {
    await this.expirePending(organizationId);
    const original = await this.findManaged(organizationId, invitationId);
    if (original.status === TeamInvitationStatus.REVOKED) {
      return this.project(original);
    }
    if (!MANAGEMENT_TRANSITIONS.has(original.status)) {
      throw this.neutralConflict();
    }

    const reserved = await this.prisma.db.teamInvitation.updateMany({
      where: {
        id: invitationId,
        organizationId,
        status: original.status,
      },
      data: { status: TeamInvitationStatus.REVOKING },
    });
    if (reserved.count !== 1) throw this.neutralConflict();

    try {
      if (original.clerkInvitationId) {
        await this.revokeClerkInvitation(original.clerkInvitationId);
      }
    } catch (error) {
      await this.prisma.db.teamInvitation.updateMany({
        where: { id: invitationId, status: TeamInvitationStatus.REVOKING },
        data: { status: original.status },
      });
      throw error;
    }

    const invitation = await this.prisma.db.teamInvitation.update({
      where: { id: invitationId },
      data: {
        status: TeamInvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
      select: INVITATION_SELECT,
    });
    await this.audit.log({
      organizationId,
      userId: actorUserId,
      action: 'REVOKE',
      entity: 'TeamInvitation',
      entityId: invitationId,
    });
    return this.project(invitation);
  }

  private async fetchVerifiedClerkProfile(
    clerkUserId: string,
  ): Promise<VerifiedClerkProfile> {
    let clerkUser: ClerkUserProfile;
    try {
      clerkUser = await this.verifier.getClient().users.getUser(clerkUserId);
    } catch {
      throw new ServiceUnavailableException(
        'Servicio de autenticación no disponible temporalmente',
      );
    }

    if (!clerkUser || clerkUser.id !== clerkUserId) {
      throw new UnauthorizedException('Sesión no válida');
    }

    const primaryEmail = clerkUser.emailAddresses?.find(
      (entry) => entry.id === clerkUser.primaryEmailAddressId,
    );
    if (!primaryEmail || primaryEmail.verification?.status !== 'verified') {
      throw new ForbiddenException(
        'El correo electrónico principal de Clerk no está verificado.',
      );
    }

    const nameParts = [clerkUser.firstName, clerkUser.lastName]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean);
    const name =
      nameParts.join(' ') ||
      (typeof clerkUser.username === 'string' ? clerkUser.username.trim() : '');
    if (!name) {
      throw new BadRequestException(
        'El perfil de Clerk debe tener configurado un nombre.',
      );
    }

    return {
      name,
      email: normalizeAccountEmail(primaryEmail.emailAddress),
    };
  }

  private async verifyAcceptedInClerk(
    invitation: InvitationRecord,
    verifiedEmail: string,
  ): Promise<void> {
    if (!invitation.clerkInvitationId) throw this.neutralConflict();

    try {
      const result = await this.verifier
        .getClient()
        .invitations.getInvitationList({
          query: invitation.clerkInvitationId,
          status: 'accepted',
          limit: 10,
        });
      const accepted = result.data.find(
        (candidate) =>
          candidate.id === invitation.clerkInvitationId &&
          candidate.status === 'accepted' &&
          normalizeAccountEmail(candidate.emailAddress) === verifiedEmail,
      );
      if (!accepted) throw this.neutralConflict();
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException(
        'No pudimos verificar la invitación en este momento.',
      );
    }
  }

  private async resolveAccepted(
    tx: Prisma.TransactionClient,
    invitation: InvitationRecord,
    clerkUserId: string,
  ): Promise<AcceptTeamInvitationResult | null> {
    if (
      invitation.status !== TeamInvitationStatus.ACCEPTED ||
      !invitation.acceptedByUserId
    ) {
      return null;
    }

    const user = await tx.user.findUnique({ where: { clerkUserId } });
    if (!user || user.id !== invitation.acceptedByUserId) return null;

    const membership = await tx.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: invitation.organizationId,
        },
      },
    });
    if (!membership || membership.role !== invitation.role) return null;

    const professional = invitation.createPublicProfile
      ? await tx.professional.findUnique({
          where: {
            organizationId_userId: {
              organizationId: invitation.organizationId,
              userId: user.id,
            },
          },
          select: { id: true },
        })
      : null;
    if (invitation.createPublicProfile && !professional) return null;

    return {
      isNew: false,
      organizationId: invitation.organizationId,
      role: membership.role,
      professionalCreated: invitation.createPublicProfile,
    };
  }

  private async acceptTransaction(
    invitationId: string,
    clerkUserId: string,
    profile: VerifiedClerkProfile,
  ): Promise<AcceptTeamInvitationResult> {
    return this.prisma.db.$transaction(
      async (tx) => {
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "TeamInvitation" WHERE "id" = ${invitationId} FOR UPDATE`,
        );
        const invitation = await tx.teamInvitation.findUnique({
          where: { id: invitationId },
          select: INVITATION_SELECT,
        });
        if (!invitation || invitation.email !== profile.email) {
          throw this.neutralConflict();
        }

        const existingResult = await this.resolveAccepted(
          tx,
          invitation,
          clerkUserId,
        );
        if (existingResult) return existingResult;

        if (
          invitation.status !== TeamInvitationStatus.PENDING ||
          invitation.expiresAt <= new Date()
        ) {
          throw this.neutralConflict();
        }

        let user = await tx.user.findUnique({ where: { clerkUserId } });
        if (!user) {
          const emailCollision = await tx.user.findUnique({
            where: { email: profile.email },
          });
          if (emailCollision) throw this.neutralConflict();

          user = await tx.user.create({
            data: {
              clerkUserId,
              email: profile.email,
              name: profile.name,
              password: null,
              lastOrganizationId: invitation.organizationId,
            },
          });
        }

        const existingMembership = await tx.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: invitation.organizationId,
            },
          },
        });
        if (existingMembership) throw this.neutralConflict();

        const membership = await tx.membership.create({
          data: {
            userId: user.id,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        });

        const professional = invitation.createPublicProfile
          ? await tx.professional.create({
              data: {
                organizationId: invitation.organizationId,
                userId: user.id,
                name: profile.name,
                status: ProfessionalStatus.ACTIVE,
                isPublic: true,
              },
              select: { id: true },
            })
          : null;

        await tx.teamInvitation.update({
          where: { id: invitation.id },
          data: {
            status: TeamInvitationStatus.ACCEPTED,
            acceptedByUserId: user.id,
            acceptedAt: new Date(),
          },
        });

        await this.audit.logTransactional(
          {
            organizationId: invitation.organizationId,
            userId: user.id,
            action: 'ACCEPT',
            entity: 'TeamInvitation',
            entityId: invitation.id,
          },
          tx,
        );
        await this.audit.logTransactional(
          {
            organizationId: invitation.organizationId,
            userId: user.id,
            action: 'CREATE',
            entity: 'Membership',
            entityId: membership.id,
          },
          tx,
        );
        if (professional) {
          await this.audit.logTransactional(
            {
              organizationId: invitation.organizationId,
              userId: user.id,
              action: 'CREATE',
              entity: 'Professional',
              entityId: professional.id,
            },
            tx,
          );
        }

        return {
          isNew: true,
          organizationId: invitation.organizationId,
          role: membership.role,
          professionalCreated: professional !== null,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async accept(
    invitationId: string,
    clerkUserId: string,
  ): Promise<AcceptTeamInvitationResult> {
    const invitation = await this.prisma.db.teamInvitation.findUnique({
      where: { id: invitationId },
      select: INVITATION_SELECT,
    });
    if (
      !invitation ||
      (invitation.status !== TeamInvitationStatus.PENDING &&
        invitation.status !== TeamInvitationStatus.ACCEPTED)
    ) {
      throw this.neutralConflict();
    }

    if (
      invitation.status === TeamInvitationStatus.PENDING &&
      invitation.expiresAt <= new Date()
    ) {
      const expired = await this.prisma.db.teamInvitation.updateMany({
        where: {
          id: invitation.id,
          status: TeamInvitationStatus.PENDING,
        },
        data: { status: TeamInvitationStatus.EXPIRED },
      });
      if (expired.count === 1) throw this.neutralConflict();
    }

    const profile = await this.fetchVerifiedClerkProfile(clerkUserId);
    if (profile.email !== invitation.email) throw this.neutralConflict();
    await this.verifyAcceptedInClerk(invitation, profile.email);

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.acceptTransaction(invitationId, clerkUserId, profile);
      } catch (error) {
        const retryable =
          isSerializationFailureError(error) || isUniqueConstraintError(error);
        if (retryable && attempt < maxAttempts) continue;
        if (retryable) throw this.neutralConflict();
        throw error;
      }
    }

    throw this.neutralConflict();
  }
}
