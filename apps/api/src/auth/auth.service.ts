import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password, organizationId } = registerDto;

    const organization = await this.prisma.db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new BadRequestException('La organización no existe');
    }

    const existingUser = await this.prisma.db.user.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email,
        },
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'El usuario ya está registrado en esta organización',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        organizationId,
        role: 'OWNER',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Crea un usuario dentro de la organización de quien invita, con un rol
   * distinto a OWNER. organizationId viene del token del usuario autenticado
   * que hace la invitación (no del body), para que nadie pueda crear
   * usuarios en una organización que no es la suya.
   */
  async inviteUser(organizationId: string, inviteUserDto: InviteUserDto) {
    const { name, email, password, role } = inviteUserDto;

    const existingUser = await this.prisma.db.user.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email,
        },
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'El usuario ya está registrado en esta organización',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        organizationId,
        role,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(loginDto: LoginDto) {
    const { email, password, organizationId } = loginDto;

    // 1. Buscar al usuario en la base de datos
    const user = await this.prisma.db.user.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email,
        },
      },
    });

    // Si no existe, lanzamos error 401
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Verificar que la contraseña coincida
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Generar el payload del JWT con los datos críticos
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    // 4. Retornar el token y los datos del usuario
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userData } = user;

    return {
      user: userData,
      accessToken: await this.jwtService.signAsync(payload),
    };
  }
}
