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
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { isUniqueConstraintError } from '../common/prisma-error.util';
import { AttemptLimiter } from './attempt-limiter';

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

@Injectable()
export class AuthService {
  private readonly loginLimiter: AttemptLimiter;
  private readonly passwordChangeLimiter: AttemptLimiter;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cache: Cache,
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
  // es un caso distinto, cubierto por inviteUser().)
  async register(registerDto: RegisterDto) {
    const { name, email, password, organizationId } = registerDto;

    const organization = await this.prisma.db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new BadRequestException('La organización no existe');
    }

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
        const createdUser = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            lastOrganizationId: organizationId,
          },
        });

        await tx.membership.create({
          data: {
            userId: createdUser.id,
            organizationId,
            role: 'OWNER',
          },
        });

        return createdUser;
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (err) {
      if (isUniqueConstraintError(err, 'email')) {
        throw new ConflictException(
          'Ya existe una cuenta con este correo. Inicia sesión en vez de registrarte de nuevo.',
        );
      }
      throw err;
    }
  }

  /**
   * Invita a alguien a la organización de quien invita (organizationId
   * viene del token, nunca del body). Si el correo ya existe globalmente
   * en Kortek, NO se crea un User duplicado — se le agrega una Membership
   * nueva a su cuenta existente. Es el caso de uso real de la identidad
   * global: una persona con acceso a varias barberías.
   */
  async inviteUser(organizationId: string, inviteUserDto: InviteUserDto) {
    const { name, email, password, role, createPublicProfile } = inviteUserDto;

    const existingUser = await this.prisma.db.user.findUnique({
      where: { email },
    });

    const whatsappBaseUrl = process.env.WHATSAPP_BASE_URL || 'https://wa.me/';

    if (existingUser) {
      return this.attachMembershipToExistingUser(
        existingUser.id,
        organizationId,
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

    const isPasswordValid = user
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

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: membership.organizationId,
        role: membership.role,
      },
      accessToken: await this.jwtService.signAsync(payload),
    };
  }

  // Cualquier usuario autenticado (cualquier rol, incluido CUSTOMER) puede
  // cambiar su propia contraseña. userId sale del token, nunca del body.
  //
  // Fuerza bruta: mismo patrón que login — bloqueo por cuenta (userId)
  // contando solo intentos con currentPassword incorrecta. El escenario
  // que protege es un token robado usado para adivinar la contraseña
  // real por fuerza bruta.
  async updatePassword(userId: string, dto: UpdatePasswordDto) {
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

    return { success: true };
  }
}
