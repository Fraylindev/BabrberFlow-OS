import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ClerkSessionVerifierService } from './clerk/clerk-session-verifier.service';
import { ClerkOnboardingDto } from './dto/clerk-onboarding.dto';
import {
  normalizeAccountEmail,
  normalizeOrganizationSlug,
} from './organization-slug';
import {
  isSerializationFailureError,
  isUniqueConstraintError,
} from '../common/prisma-error.util';

export interface OnboardOwnerResult {
  isNew: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    clerkUserId: string | null;
    lastOrganizationId: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    email: string;
  };
  role: string;
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

@Injectable()
export class ClerkOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly verifier: ClerkSessionVerifierService,
  ) {}

  private async recordEmailConflict(): Promise<void> {
    await this.audit.log({
      organizationId: null,
      userId: null,
      action: 'CLERK_ONBOARDING_EMAIL_CONFLICT',
      entity: 'SecurityEvent',
    });
  }

  async getVerifiedClerkProfile(
    clerkUserId: string,
  ): Promise<{ name: string; email: string }> {
    let clerkUser: ClerkUserProfile;
    try {
      const client = this.verifier.getClient();
      clerkUser = await client.users.getUser(clerkUserId);
    } catch {
      throw new ServiceUnavailableException(
        'Servicio de autenticación no disponible temporalmente',
      );
    }

    if (!clerkUser || clerkUser.id !== clerkUserId) {
      throw new UnauthorizedException('Sesión no válida');
    }

    const nameParts = [clerkUser.firstName, clerkUser.lastName]
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean);

    let resolvedName = '';
    if (nameParts.length > 0) {
      resolvedName = nameParts.join(' ');
    } else if (
      typeof clerkUser.username === 'string' &&
      clerkUser.username.trim().length > 0
    ) {
      resolvedName = clerkUser.username.trim();
    } else {
      throw new BadRequestException(
        'El perfil de Clerk debe tener configurado un nombre o nombre de usuario.',
      );
    }

    const primaryId = clerkUser.primaryEmailAddressId;
    const primaryEmailObj = clerkUser.emailAddresses?.find(
      (e) => e.id === primaryId,
    );

    if (
      !primaryEmailObj ||
      primaryEmailObj.verification?.status !== 'verified'
    ) {
      throw new ForbiddenException(
        'El correo electrónico principal de Clerk no está verificado.',
      );
    }

    const verifiedEmail = normalizeAccountEmail(primaryEmailObj.emailAddress);

    return {
      name: resolvedName,
      email: verifiedEmail,
    };
  }

  private async resolveExistingOwner(
    clerkUserId: string,
  ): Promise<OnboardOwnerResult | null> {
    const user = await this.prisma.db.user.findUnique({
      where: { clerkUserId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) return null;

    const ownerMemberships = user.memberships.filter((m) => m.role === 'OWNER');
    if (ownerMemberships.length === 1 && ownerMemberships[0].organization) {
      const org = ownerMemberships[0].organization;
      return {
        isNew: false,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          clerkUserId: user.clerkUserId,
          lastOrganizationId: user.lastOrganizationId,
        },
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          email: org.email,
        },
        role: 'OWNER',
      };
    }

    throw new ConflictException('Estado de cuenta no válido para onboarding.');
  }

  async onboardOwner(
    clerkUserId: string,
    dto: ClerkOnboardingDto,
  ): Promise<OnboardOwnerResult> {
    const { name: resolvedName, email: verifiedEmail } =
      await this.getVerifiedClerkProfile(clerkUserId);

    // 1. Verificar si clerkUserId ya existe (Idempotencia / Estado parcial)
    const existingOwner = await this.resolveExistingOwner(clerkUserId);
    if (existingOwner) {
      return existingOwner;
    }

    // 2. Anti-enlace por email de usuario local (Respuesta completamente neutra)
    const userByEmail = await this.prisma.db.user.findUnique({
      where: { email: verifiedEmail },
    });

    if (userByEmail) {
      if (userByEmail.clerkUserId === clerkUserId) {
        const resolved = await this.resolveExistingOwner(clerkUserId);
        if (resolved) return resolved;
      }

      await this.recordEmailConflict();

      throw new ConflictException(
        'No es posible completar el registro con los datos proporcionados.',
      );
    }

    const normalizedSlug = normalizeOrganizationSlug(dto.organizationSlug);
    const normalizedOrgEmail = normalizeAccountEmail(dto.organizationEmail);

    // 3. Pre-validación de colisiones de organización
    const existingSlug = await this.prisma.db.organization.findUnique({
      where: { slug: normalizedSlug },
    });
    if (existingSlug) {
      const resolved = await this.resolveExistingOwner(clerkUserId);
      if (resolved) return resolved;

      throw new ConflictException(
        'El slug de la organización ya está en uso. Elige otro.',
      );
    }

    const existingOrgEmail = await this.prisma.db.organization.findUnique({
      where: { email: normalizedOrgEmail },
    });
    if (existingOrgEmail) {
      const resolved = await this.resolveExistingOwner(clerkUserId);
      if (resolved) return resolved;

      throw new ConflictException(
        'Ya existe una organización registrada con este correo.',
      );
    }

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        const result = await this.prisma.db.$transaction(
          async (tx) => {
            const org = await tx.organization.create({
              data: {
                name: dto.organizationName,
                slug: normalizedSlug,
                email: normalizedOrgEmail,
              },
            });

            const user = await tx.user.create({
              data: {
                name: resolvedName,
                email: verifiedEmail,
                password: null,
                clerkUserId,
                lastOrganizationId: org.id,
              },
            });

            await tx.membership.create({
              data: {
                userId: user.id,
                organizationId: org.id,
                role: 'OWNER',
              },
            });

            await this.audit.logTransactional(
              {
                organizationId: org.id,
                userId: user.id,
                action: 'CREATE',
                entity: 'Organization',
                entityId: org.id,
              },
              tx,
            );

            return {
              isNew: true,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                clerkUserId: user.clerkUserId,
                lastOrganizationId: user.lastOrganizationId,
              },
              organization: {
                id: org.id,
                name: org.name,
                slug: org.slug,
                email: org.email,
              },
              role: 'OWNER',
            };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );

        return result;
      } catch (err: unknown) {
        if (isSerializationFailureError(err)) {
          attempt++;
          if (attempt >= MAX_RETRIES) {
            throw new ConflictException(
              'No se pudo completar el onboarding debido a concurrencia tras varios intentos.',
            );
          }
          continue;
        }

        if (
          isUniqueConstraintError(err, 'clerkUserId') ||
          isUniqueConstraintError(err, 'slug') ||
          isUniqueConstraintError(err, 'email')
        ) {
          const resolved = await this.resolveExistingOwner(clerkUserId);
          if (resolved) return resolved;

          if (isUniqueConstraintError(err, 'slug')) {
            throw new ConflictException(
              'El slug de la organización ya está en uso. Elige otro.',
            );
          }

          if (isUniqueConstraintError(err, 'email')) {
            const conflictingUser = await this.prisma.db.user.findUnique({
              where: { email: verifiedEmail },
            });
            if (
              conflictingUser &&
              conflictingUser.clerkUserId !== clerkUserId
            ) {
              await this.recordEmailConflict();
            }
            throw new ConflictException(
              'No es posible completar el registro con los datos proporcionados.',
            );
          }

          throw new ConflictException(
            'Estado de cuenta no válido para onboarding.',
          );
        }

        throw err;
      }
    }

    throw new ConflictException(
      'No se pudo completar el onboarding debido a concurrencia.',
    );
  }
}
