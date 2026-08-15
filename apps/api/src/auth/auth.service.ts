import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { isUniqueConstraintError } from '../common/prisma-error.util';
import { AttemptLimiter } from './attempt-limiter';
import { AuditService } from '../audit/audit.service';

// Ventanas y umbrales del bloqueo por cuenta contra fuerza bruta — ver
// attempt-limiter.ts para el porqué de este enfoque (por cuenta, en
// memoria, no persistido). 8/10min en login: generoso para alguien que
// se equivoca de verdad, estricto contra un ataque sostenido. 5/10min en
// cambio de contraseña: más estricto porque ya requiere un token robado
// como precondición — cualquier intento ahí es más sospechoso de por sí.
const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const PASSWORD_CHANGE_MAX_ATTEMPTS = 5;
const PASSWORD_CHANGE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Autenticación pura: fundar cuenta (register), iniciar sesión (login),
 * cambiar contraseña propia (updatePassword). La gestión de equipo
 * (invitar a otros) vive en TeamService — se extrajo en la auditoría de
 * calidad (Fase 4) porque es una responsabilidad distinta, no
 * "autenticarse a uno mismo" (SRP). Mismo contrato de API en todos los
 * endpoints, solo se reorganizó el código.
 */
@Injectable()
export class AuthService {
  private readonly loginLimiter: AttemptLimiter;
  private readonly passwordChangeLimiter: AttemptLimiter;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private audit: AuditService,
  ) {
    this.loginLimiter = new AttemptLimiter(
      this.cache,
      'login-attempts',
      LOGIN_MAX_ATTEMPTS,
      LOGIN_WINDOW_MS,
    );
    this.passwordChangeLimiter = new AttemptLimiter(
      this.cache,
      'password-change-attempts',
      PASSWORD_CHANGE_MAX_ATTEMPTS,
      PASSWORD_CHANGE_WINDOW_MS,
    );
  }

  // Funda una organización nueva. Requiere un email global nuevo — si ya
  // existe una cuenta en Kortek con ese correo, se rechaza con 409 en vez
  // de crear una cuenta duplicada o reutilizar la existente en silencio.
  // (Invitar a alguien que YA tiene cuenta a una organización adicional
  // es un caso distinto, cubierto por TeamService.inviteUser().)
  async register(registerDto: RegisterDto) {
    const { name, email, password, organizationName, organizationSlug } = registerDto;

    const existingUser = await this.prisma.db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(
        'Ya existe una cuenta con este correo. Inicia sesión en vez de registrarte de nuevo.',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await this.prisma.db.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: organizationName,
            slug: organizationSlug,
            email,
          },
        });

        const createdUser = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            lastOrganizationId: org.id,
          },
        });

        await tx.membership.create({
          data: {
            userId: createdUser.id,
            organizationId: org.id,
            role: 'OWNER',
          },
        });

        return createdUser;
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (err) {
      if (isUniqueConstraintError(err, 'slug')) {
        throw new ConflictException(
          'El slug de la organización ya está en uso. Elige otro.',
        );
      }
      if (isUniqueConstraintError(err, 'email')) {
        // En caso de que el email ya exista en Organization
        throw new ConflictException(
          'Ya existe una organización o cuenta con este correo.',
        );
      }
      throw err;
    }
  }

  // Login de un solo paso. Resuelve la organización activa vía
  // lastOrganizationId (o la primera membresía disponible si no hay
  // ninguna guardada todavía — caso legacy) y emite el JWT ya con el
  // contexto del tenant. Nunca pide organizationId en el body.
  //
  // Fuerza bruta: bloqueo por cuenta (email) además del límite por IP ya
  // aplicado en el controller. Solo cuenta intentos con contraseña
  // incorrecta — nunca penaliza a alguien que ya inició sesión bien.
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    await this.loginLimiter.assertNotLocked(
      email,
      'Demasiados intentos fallidos para esta cuenta. Intenta de nuevo en unos minutos.',
    );

    const user = await this.prisma.db.user.findUnique({ where: { email } });

    const isPasswordValid = (user && user.password)
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!user || !isPasswordValid) {
      await this.loginLimiter.recordFailure(email);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.loginLimiter.reset(email);

    let membership = user.lastOrganizationId
      ? await this.prisma.db.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId: user.lastOrganizationId,
            },
          },
        })
      : null;

    if (!membership) {
      // Caso legacy (o lastOrganizationId apuntando a una membresía que ya
      // no existe): usa la primera membresía disponible y la guarda.
      membership = await this.prisma.db.membership.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      if (!membership) {
        throw new UnauthorizedException(
          'Esta cuenta no tiene ninguna organización asociada',
        );
      }

      await this.prisma.db.user.update({
        where: { id: user.id },
        data: { lastOrganizationId: membership.organizationId },
      });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: membership.role,
      organizationId: membership.organizationId,
    };

    const organization = await this.prisma.db.organization.findUnique({
      where: {
        id: membership.organizationId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!organization) {
      throw new UnauthorizedException('La organización no existe');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: membership.organizationId,
        role: membership.role,
      },
      accessToken: await this.jwtService.signAsync(payload),
      organization,
    };
  }

  // Cualquier usuario autenticado (cualquier rol, incluido CUSTOMER) puede
  // cambiar su propia contraseña. userId sale del token, nunca del body.
  //
  // Fuerza bruta: mismo patrón que login — bloqueo por cuenta (userId)
  // contando solo intentos con currentPassword incorrecta. El escenario
  // que protege es un token robado usado para adivinar la contraseña
  // real por fuerza bruta.
  async updatePassword(
    userId: string,
    organizationId: string,
    dto: UpdatePasswordDto,
  ) {
    await this.passwordChangeLimiter.assertNotLocked(
      userId,
      'Demasiados intentos fallidos. Intenta de nuevo en unos minutos.',
    );

    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentValid) {
      await this.passwordChangeLimiter.recordFailure(userId);
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    await this.passwordChangeLimiter.reset(userId);

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
    });

    return { success: true };
  }
}
