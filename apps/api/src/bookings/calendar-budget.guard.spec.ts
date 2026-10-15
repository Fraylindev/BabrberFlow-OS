import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PrismaService } from '../prisma/prisma.service';
import { CalendarBudgetGuard } from './calendar-budget.guard';
import { PostgresThrottlerStorage } from '../security/postgres-throttler.storage';
import { CalendarController } from './calendar.controller';

jest.mock('../security/postgres-throttler.storage', () => ({
  PostgresThrottlerStorage: jest.fn().mockImplementation(() => ({
    increment: jest
      .fn()
      .mockResolvedValue({ isBlocked: true, timeToBlockExpire: 17 }),
  })),
}));

describe('M3 rate limit Retry-After emission', () => {
  it.each([
    ['list', 'read', 60],
    ['detail', 'read', 60],
    ['days', 'availability', 30],
    ['slots', 'availability', 30],
    ['reschedule', 'write', 10],
  ] as const)(
    '%s emits the real remaining time before throwing 429',
    async (handler, budget, limit) => {
      const setHeader = jest.fn();
      const guard = new CalendarBudgetGuard(
        {} as PrismaService,
        new Reflector(),
      );
      const context = {
        getHandler: () =>
          Object.getOwnPropertyDescriptor(CalendarController.prototype, handler)
            ?.value as () => unknown,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'synthetic-actor', organizationId: 'synthetic-tenant' },
          }),
          getResponse: () => ({ setHeader }),
        }),
      } as unknown as ExecutionContext;
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: 429,
      });
      expect(setHeader).toHaveBeenCalledWith('Retry-After', '17');
      expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
      const storage = (PostgresThrottlerStorage as jest.Mock).mock.results.at(
        -1,
      )?.value as {
        increment: jest.Mock;
      };
      expect(storage.increment).toHaveBeenCalledWith(
        JSON.stringify(['synthetic-tenant', 'synthetic-actor']),
        60000,
        limit,
        60000,
        'm3-' + budget,
      );
    },
  );
});
