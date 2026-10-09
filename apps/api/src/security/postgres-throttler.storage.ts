import { createHmac } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

interface BucketRow {
  count: number;
  timeToExpire: number;
  timeToBlockExpire: number;
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
    private readonly cleanupLimit?: number,
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
        RETURNING "count",
          CEIL(LEAST(${ttlMs}::numeric, GREATEST(0,
            EXTRACT(EPOCH FROM ("expiresAt" - NOW())) * 1000
          )) / 1000)::integer AS "timeToExpire",
          CEIL(LEAST(${blockMs}::numeric, GREATEST(0,
            COALESCE(EXTRACT(EPOCH FROM ("blockedUntil" - NOW())) * 1000, 0)
          )) / 1000)::integer AS "timeToBlockExpire"
      `);
      if (!row) throw new Error('rate bucket returned no row');

      const now = Date.now();
      if (now - this.lastCleanup > 3_600_000) {
        this.lastCleanup = now;
        if (this.cleanupLimit !== undefined) {
          const limit = Math.max(1, Math.trunc(this.cleanupLimit));
          void this.prisma.db.$executeRaw`
            DELETE FROM "SecurityRateBucket" WHERE "key" IN (
              SELECT "key" FROM "SecurityRateBucket"
              WHERE "expiresAt" < NOW() - INTERVAL '24 hours'
                AND ("blockedUntil" IS NULL OR "blockedUntil" < NOW() - INTERVAL '24 hours')
              ORDER BY "expiresAt" LIMIT ${limit}
            )
          `.catch(() => undefined);
        } else {
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
      }

      // NOW() is identical throughout the atomic statement. SQL also caps the
      // remainder when a concurrent writer started after this transaction's NOW().
      // The Node clock above schedules cleanup only; it cannot affect the budget.
      return {
        totalHits: row.count,
        timeToExpire: row.timeToExpire,
        isBlocked: row.timeToBlockExpire > 0,
        timeToBlockExpire: row.timeToBlockExpire,
      };
    } catch {
      // Sensitive mutations fail closed when the shared budget is unavailable.
      throw new ServiceUnavailableException(
        'Servicio temporalmente no disponible. Vuelve a intentarlo.',
      );
    }
  }
}
