import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostgresThrottlerStorage } from './postgres-throttler.storage';

describe('PostgresThrottlerStorage: authoritative PostgreSQL durations', () => {
  const secret = 'synthetic-retry-storage-unit-secret';
  const query = jest.fn();
  const cleanup = jest.fn().mockResolvedValue({ count: 0 });
  const prisma = {
    db: { $queryRaw: query, securityRateBucket: { deleteMany: cleanup } },
  } as unknown as PrismaService;

  afterEach(() => {
    jest.restoreAllMocks();
    query.mockReset();
    cleanup.mockClear();
  });

  it.each([-86_400_000, 86_400_000])(
    'returns database durations despite a simulated process clock offset of %i ms',
    async (offset) => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now + offset);
      query.mockResolvedValue([
        { count: 31, timeToExpire: 59, timeToBlockExpire: 60 },
      ]);
      const storage = new PostgresThrottlerStorage(prisma, secret);
      expect(
        await storage.increment('synthetic-ip', 60000, 30, 60000, 'default'),
      ).toEqual({
        totalHits: 31,
        timeToExpire: 59,
        isBlocked: true,
        timeToBlockExpire: 60,
      });
    },
  );

  it('keeps a positive rounded database remainder blocked', async () => {
    query.mockResolvedValue([
      { count: 32, timeToExpire: 0, timeToBlockExpire: 1 },
    ]);
    expect(
      await new PostgresThrottlerStorage(prisma, secret).increment(
        'synthetic-ip',
        60000,
        30,
        60000,
        'default',
      ),
    ).toEqual({
      totalHits: 32,
      timeToExpire: 0,
      isBlocked: true,
      timeToBlockExpire: 1,
    });
  });

  it('returns an unblocked reset supplied by the database', async () => {
    query.mockResolvedValue([
      { count: 1, timeToExpire: 60, timeToBlockExpire: 0 },
    ]);
    expect(
      await new PostgresThrottlerStorage(prisma, secret).increment(
        'synthetic-ip',
        60000,
        30,
        60000,
        'default',
      ),
    ).toEqual({
      totalHits: 1,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it.each(['unavailable', 'empty'])(
    'fails closed when the database is %s',
    async (mode) => {
      if (mode === 'empty') query.mockResolvedValue([]);
      else
        query.mockRejectedValue(new Error('synthetic-private-database-detail'));
      await expect(
        new PostgresThrottlerStorage(prisma, secret).increment(
          'synthetic-ip',
          60000,
          30,
          60000,
          'default',
        ),
      ).rejects.toEqual(
        new ServiceUnavailableException(
          'Servicio temporalmente no disponible. Vuelve a intentarlo.',
        ),
      );
    },
  );
});
