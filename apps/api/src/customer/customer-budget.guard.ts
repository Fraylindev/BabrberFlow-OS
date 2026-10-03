import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ClerkOnboardingRequest } from '../auth/guards/clerk-onboarding.guard';
import { PostgresThrottlerStorage } from '../security/postgres-throttler.storage';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerBudgetGuard implements CanActivate {
  private readonly storage: PostgresThrottlerStorage;
  constructor(prisma: PrismaService) {
    this.storage = new PostgresThrottlerStorage(
      prisma,
      process.env.RATE_LIMIT_SECRET ?? process.env.JWT_SECRET ?? '',
      100,
    );
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<ClerkOnboardingRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    // Se aplica también antes de errores de validación, permisos o dependencia.
    response.setHeader('Cache-Control', 'private, no-store');
    const actor = request.clerkSession?.clerkUserId;
    if (!actor) throw new UnauthorizedException('Sesión no válida');
    const kind =
      request.method === 'POST'
        ? 'create'
        : request.method === 'PATCH'
          ? 'profile'
          : 'read';
    const limit = kind === 'create' ? 5 : kind === 'profile' ? 10 : 60;
    const slug = String(request.params.slug ?? 'businesses')
      .toLowerCase()
      .slice(0, 50);
    // Techo IP global por superficie; el slug forjado no lo reinicia.
    for (const [tracker, budget] of [
      [`ip:${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`, 180],
      [`actor:${actor}:${slug}:${kind}`, limit],
    ] as const) {
      const result = await this.storage.increment(
        tracker,
        60000,
        budget,
        60000,
        'customer',
      );
      if (result.isBlocked) {
        response.setHeader(
          'Retry-After',
          Math.max(1, result.timeToBlockExpire),
        );
        throw new HttpException(
          'Has realizado varios intentos. Espera un momento antes de volver a probar.',
          429,
        );
      }
    }
    return true;
  }
}
