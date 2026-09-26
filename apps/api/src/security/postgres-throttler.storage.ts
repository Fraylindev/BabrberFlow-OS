import { createHmac } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

interface BucketRow {
  count: number;
  expiresAt: Date;
  blockedUntil: Date | null;
}

interface ThrottleResult {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/** Atomic PostgreSQL budget shared by every API process. No raw tracker is stored. */
export class PostgresThrottlerStorage implements ThrottlerStorage {
  private lastCleanup = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly secret: string,
  ) {
    if (secret.length < 32) {
      throw new Error('RATE_LIMIT_SECRET must contain at least 32 characters');
    }
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottleResult> {
    const digest = createHmac('sha256', this.secret)
      .update(`${throttlerName}:${key}`)
      .digest('hex');
    const ttlMs = Math.max(1, Math.trunc(ttl));
    const blockMs = Math.max(1, Math.trunc(blockDuration));
    const maxHits = Math.max(1, Math.trunc(limit));

    try {
      const [row] = await this.prisma.db.$queryRaw<BucketRow[]>(Prisma.sql`
        INSERT INTO "SecurityRateBucket" ("key", "count", "expiresAt", "blockedUntil")
        VALUES (${digest}, 1, NOW() + ${ttlMs} * INTERVAL '1 millisecond', NULL)
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE
            WHEN "SecurityRateBucket"."expiresAt" <= NOW()
              AND COALESCE("SecurityRateBucket"."blockedUntil", NOW()) <= NOW()
            THEN 1 ELSE "SecurityRateBucket"."count" + 1 END,
          "expiresAt" = CASE
            WHEN "SecurityRateBucket"."expiresAt" <= NOW()
              AND COALESCE("SecurityRateBucket"."blockedUntil", NOW()) <= NOW()
            THEN NOW() + ${ttlMs} * INTERVAL '1 millisecond'
            ELSE "SecurityRateBucket"."expiresAt" END,
          "blockedUntil" = CASE
            WHEN "SecurityRateBucket"."expiresAt" <= NOW()
              AND COALESCE("SecurityRateBucket"."blockedUntil", NOW()) <= NOW()
            THEN NULL
            WHEN "SecurityRateBucket"."blockedUntil" > NOW()
            THEN "SecurityRateBucket"."blockedUntil"
            WHEN "SecurityRateBucket"."count" + 1 > ${maxHits}
            THEN NOW() + ${blockMs} * INTERVAL '1 millisecond'
            ELSE NULL END
        RETURNING "count", "expiresAt", "blockedUntil"
      `);
      if (!row) throw new Error('rate bucket returned no row');

      const now = Date.now();
      if (now - this.lastCleanup > 3_600_000) {
        this.lastCleanup = now;
        void this.prisma.db.securityRateBucket
          .deleteMany({
            where: {
              expiresAt: { lt: new Date(now - 86_400_000) },
              OR: [
                { blockedUntil: null },
                { blockedUntil: { lt: new Date(now - 86_400_000) } },
              ],
            },
          })
          .catch(() => undefined);
      }

      const timeToExpire = Math.max(
        0,
        Math.ceil((row.expiresAt.getTime() - now) / 1000),
      );
      const timeToBlockExpire = row.blockedUntil
        ? Math.max(0, Math.ceil((row.blockedUntil.getTime() - now) / 1000))
        : 0;
      return {
        totalHits: row.count,
        timeToExpire,
        isBlocked: timeToBlockExpire > 0,
        timeToBlockExpire,
      };
    } catch {
      // Sensitive mutations fail closed when the shared budget is unavailable.
      throw new ServiceUnavailableException(
        'Servicio temporalmente no disponible. Vuelve a intentarlo.',
      );
    }
  }
}
