import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { isUniqueConstraintError } from '../common/prisma-error.util';

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
        createPublicProfile,
        name,
        whatsappBaseUrl,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await this.prisma.db.$transaction(async (tx) => {
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

        if (createPublicProfile) {
          await tx.professional.create({
            data: { organizationId, name, userId: createdUser.id },
          });
        }

        return createdUser;
      });

      // Cambio administrativo: alguien nuevo obtiene acceso a la
      // organización. userId = quien invitó (el actor), entityId = a
      // quién se invitó (el objeto de la acción).
      await this.audit.log({
        organizationId,
        userId: invitedBy,
        action: 'INVITE',
        entity: 'Membership',
        entityId: user.id,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _p, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        professionalCreated: !!createPublicProfile,
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

  // Un Professional solo puede estar vinculado a UN User globalmente
  // (Professional.userId es único, diseñado antes de que existiera el
  // multi-organización real). Si esta persona ya tiene un perfil público
  // en OTRA organización, no se puede crear uno nuevo aquí todavía —
  // limitación conocida y documentada, no un bug silencioso.
  private async attachMembershipToExistingUser(
    userId: string,
    organizationId: string,
    invitedBy: string,
    role: InviteUserDto['role'],
    createPublicProfile: boolean | undefined,
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
    if (createPublicProfile) {
      try {
        await this.prisma.db.professional.create({
          data: { organizationId, name, userId },
        });
        professionalCreated = true;
      } catch (err) {
        if (!isUniqueConstraintError(err, 'userId')) throw err;
        // Limitación conocida (ver comentario del método): ya tiene un
        // Professional en otra organización. La membresía igual se creó.
        professionalCreated = false;
      }
    }

    const user = await this.prisma.db.user.findUniqueOrThrow({
      where: { id: userId },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, professionalCreated, whatsappBaseUrl };
  }
}
