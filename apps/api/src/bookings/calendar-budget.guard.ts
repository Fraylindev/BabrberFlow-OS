import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { PostgresThrottlerStorage } from '../security/postgres-throttler.storage';
export const CALENDAR_BUDGET = 'm3-calendar-budget';
@Injectable()
export class CalendarBudgetGuard implements CanActivate {
  private readonly storage: PostgresThrottlerStorage;
  constructor(
    prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {
    this.storage = new PostgresThrottlerStorage(
      prisma,
      process.env.RATE_LIMIT_SECRET ?? process.env.JWT_SECRET ?? '',
    );
  }
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store');
    const budget =
      this.reflector.get<'read' | 'availability' | 'write'>(
        CALENDAR_BUDGET,
        context.getHandler(),
      ) ?? 'read';
    const limit = { read: 60, availability: 30, write: 10 }[budget];
    const hit = await this.storage.increment(
      JSON.stringify([request.user.organizationId, request.user.id]),
      60000,
      limit,
      60000,
      'm3-' + budget,
    );
    if (hit.isBlocked) {
      response.setHeader('Retry-After', String(hit.timeToBlockExpire));
      throw new HttpException(
        'Demasiados intentos. Espera un momento y vuelve a probar.',
        429,
      );
    }
    return true;
  }
}
