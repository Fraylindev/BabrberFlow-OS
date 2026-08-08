import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../types/authenticated-request';

// Definimos la estructura exacta del payload que creamos en el login
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  // Re-verificamos contra Membership en cada request (no confiamos ciegamente
  // en el role/organizationId del payload): si se revoca el acceso de
  // alguien (se borra su Membership) o le cambian el rol, el efecto es
  // inmediato, no hay que esperar a que expire el token de hasta 1 día.
  async validate(payload: JwtPayload): Promise<RequestUser> {
    const membership = await this.prisma.db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: payload.sub,
          organizationId: payload.organizationId,
        },
      },
      include: { user: true },
    });

    if (!membership) {
      throw new UnauthorizedException(
        'Sesión no válida para esta organización',
      );
    }

    return {
      id: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      organizationId: membership.organizationId,
      role: membership.role,
    };
  }
}
