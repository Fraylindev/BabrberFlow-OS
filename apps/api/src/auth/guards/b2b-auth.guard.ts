import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedRequest } from '../types/authenticated-request';
import type { JwtPayload } from '../strategies/jwt.strategy';
import { ClerkAuthGuard } from './clerk-auth.guard';

/**
 * Compatibilidad temporal para el panel B2B durante la migración a Clerk.
 *
 * - Un JWT legacy firmado conserva su organizationId y se revalida contra la
 *   Membership local, igual que JwtStrategy.
 * - Cualquier token que no sea un JWT legacy válido se delega al guard Clerk,
 *   que exige exactamente un x-organization-id y verifica sesión + Membership.
 *
 * Este guard no emite ni intercambia tokens y no cambia las rutas legacy de
 * login/register/password/invite. Se retirará junto al JWT legacy en A0.7.
 */
@Injectable()
export class B2bAuthGuard implements CanActivate {
  private readonly logger = new Logger(B2bAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly clerkAuthGuard: ClerkAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.readBearerToken(request.headers.authorization);

    if (!token) {
      return this.clerkAuthGuard.canActivate(context);
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      return this.clerkAuthGuard.canActivate(context);
    }

    if (!isUUID(payload.sub) || !isUUID(payload.organizationId)) {
      throw this.unauthorized();
    }

    try {
      const membership = await this.prisma.db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: payload.sub,
            organizationId: payload.organizationId,
          },
        },
        select: {
          organizationId: true,
          role: true,
          user: { select: { id: true, email: true, name: true } },
        },
      });

      if (!membership) {
        throw this.unauthorized();
      }

      request.user = {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
        organizationId: membership.organizationId,
        role: membership.role,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `Error inesperado al resolver JWT legacy: ${error instanceof Error ? error.constructor.name : 'UnknownError'}`,
      );
      throw this.unauthorized();
    }
  }

  private readBearerToken(value: string | string[] | undefined): string | null {
    if (typeof value !== 'string') return null;
    const match = /^Bearer\s+([^\s]+)$/i.exec(value.trim());
    return match?.[1] ?? null;
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException('Sesión no válida para esta organización');
  }
}
