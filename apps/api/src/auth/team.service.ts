import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { isUniqueConstraintError } from '../common/prisma-error.util';
import { ProfessionalStatus, UserRole } from '@prisma/client';

/**
 * Gestión de equipo (invitar miembros) — antes vivía dentro de
 * AuthService, mezclada con autenticación. Es una responsabilidad
 * genuinamente distinta (SRP): autenticar a alguien que ya tiene cuenta
 * no es lo mismo que decidir quién más puede entrar a una organización.
 * Extraído en la auditoría de calidad (Fase 4) — mismo comportamiento,
 * mismo contrato de /auth/invite, solo reorganizado.
 */
@Injectable()
export class TeamService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Invita a alguien a la organización de quien invita (organizationId
   * viene del token, nunca del body). Si el correo ya existe globalmente
   * en Kortek, NO se crea un User duplicado — se le agrega una Membership
   * nueva a su cuenta existente. Es el caso de uso real de la identidad
   * global: una persona con acceso a varias barberías.
   */
  async inviteUser(
    organizationId: string,
    invitedBy: string,
    inviteUserDto: InviteUserDto,
  ) {
    const { name, email, password, role, createPublicProfile } = inviteUserDto;
    const shouldCreatePublicProfile =
      role === UserRole.BARBER && createPublicProfile === true;

    const existingUser = await this.prisma.db.user.findUnique({
      where: { email },
    });

    const whatsappBaseUrl = process.env.WHATSAPP_BASE_URL || 'https://wa.me/';

    if (existingUser) {
      return this.attachMembershipToExistingUser(
        existingUser.id,
        organizationId,
        invitedBy,
        role,
        shouldCreatePublicProfile,
        name,
        whatsappBaseUrl,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const result = await this.prisma.db.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            lastOrganizationId: organizationId,
          },
        });

        await tx.membership.create({
          data: { userId: createdUser.id, organizationId, role },
        });

        const professional = shouldCreatePublicProfile
          ? await tx.professional.create({
              data: {
                organizationId,
                name: name.trim(),
                userId: createdUser.id,
                status: ProfessionalStatus.ACTIVE,
                isPublic: true,
              },
              select: { id: true },
            })
          : null;

        return { user: createdUser, professional };
      });

      // Cambio administrativo: alguien nuevo obtiene acceso a la
      // organización. userId = quien invitó (el actor), entityId = a
      // quién se invitó (el objeto de la acción).
      await this.audit.log({
        organizationId,
        userId: invitedBy,
        action: 'INVITE',
        entity: 'Membership',
        entityId: result.user.id,
      });
      if (result.professional) {
        await this.audit.log({
          organizationId,
          userId: invitedBy,
          action: 'CREATE',
          entity: 'Professional',
          entityId: result.professional.id,
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _p, ...userWithoutPassword } = result.user;
      return {
        ...userWithoutPassword,
        professionalCreated: shouldCreatePublicProfile,
        whatsappBaseUrl,
      };
    } catch (err) {
      if (isUniqueConstraintError(err, 'email')) {
        // Carrera: alguien creó ese User entre el findUnique y el create.
        throw new ConflictException(
          'Ya existe una cuenta con este correo. Intenta de nuevo.',
        );
      }
      throw err;
    }
  }

  // Un User puede tener un Professional por organización. La unicidad
  // compuesta permite identidad global sin mezclar perfiles entre tenants.
  private async attachMembershipToExistingUser(
    userId: string,
    organizationId: string,
    invitedBy: string,
    role: InviteUserDto['role'],
    shouldCreatePublicProfile: boolean,
    name: string,
    whatsappBaseUrl: string,
  ) {
    try {
      await this.prisma.db.membership.create({
        data: { userId, organizationId, role },
      });
    } catch (err) {
      if (isUniqueConstraintError(err, 'userId')) {
        throw new ConflictException(
          'Esta persona ya es miembro de esta organización.',
        );
      }
      throw err;
    }

    await this.audit.log({
      organizationId,
      userId: invitedBy,
      action: 'INVITE',
      entity: 'Membership',
      entityId: userId,
    });

    let professionalCreated = false;
    let professionalId: string | null = null;
    if (shouldCreatePublicProfile) {
      try {
        const professional = await this.prisma.db.professional.create({
          data: {
            organizationId,
            name: name.trim(),
            userId,
            status: ProfessionalStatus.ACTIVE,
            isPublic: true,
          },
          select: { id: true },
        });
        professionalCreated = true;
        professionalId = professional.id;
      } catch (err) {
        if (!isUniqueConstraintError(err, 'userId')) throw err;
        // Puede existir ya el vínculo compuesto dentro de esta organización.
        professionalCreated = false;
      }
    }

    if (professionalId) {
      await this.audit.log({
        organizationId,
        userId: invitedBy,
        action: 'CREATE',
        entity: 'Professional',
        entityId: professionalId,
      });
    }

    const user = await this.prisma.db.user.findUniqueOrThrow({
      where: { id: userId },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, professionalCreated, whatsappBaseUrl };
  }
}
