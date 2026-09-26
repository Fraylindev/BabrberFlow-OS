import { createHmac } from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Shared failed-attempt budget, keyed by HMAC of the normalized account. */
export class AttemptLimiter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly secret: string,
    private readonly keyPrefix: string,
    private readonly maxAttempts: number,
    private readonly windowMs: number,
  ) {
    if (secret.length < 32) {
      throw new Error('RATE_LIMIT_SECRET must contain at least 32 characters');
    }
  }

  private key(identifier: string): string {
    return createHmac('sha256', this.secret)
      .update(`${this.keyPrefix}:${identifier.toLowerCase().trim()}`)
      .digest('hex');
  }

  async assertNotLocked(identifier: string, message: string): Promise<void> {
    let bucket: { count: number; expiresAt: Date } | null;
    try {
      bucket = await this.prisma.db.securityRateBucket.findUnique({
        where: { key: this.key(identifier) },
        select: { count: true, expiresAt: true },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Servicio temporalmente no disponible. Vuelve a intentarlo.',
      );
    }
    if (
      bucket &&
      bucket.count >= this.maxAttempts &&
      bucket.expiresAt.getTime() > Date.now()
    ) {
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async recordFailure(identifier: string): Promise<void> {
    const key = this.key(identifier);
    try {
      await this.prisma.db.$queryRaw(Prisma.sql`
        INSERT INTO "SecurityRateBucket" ("key", "count", "expiresAt", "blockedUntil")
        VALUES (${key}, 1, NOW() + ${this.windowMs} * INTERVAL '1 millisecond', NULL)
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "SecurityRateBucket"."expiresAt" <= NOW()
            THEN 1 ELSE LEAST("SecurityRateBucket"."count"::bigint + 1, 2147483647)::int END,
          "expiresAt" = CASE WHEN "SecurityRateBucket"."expiresAt" <= NOW()
            THEN NOW() + ${this.windowMs} * INTERVAL '1 millisecond'
            ELSE "SecurityRateBucket"."expiresAt" END
      `);
    } catch {
      throw new ServiceUnavailableException(
        'Servicio temporalmente no disponible. Vuelve a intentarlo.',
      );
    }
  }

  async reset(identifier: string): Promise<void> {
    try {
      await this.prisma.db.securityRateBucket.deleteMany({
        where: { key: this.key(identifier) },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Servicio temporalmente no disponible. Vuelve a intentarlo.',
      );
    }
  }
}
