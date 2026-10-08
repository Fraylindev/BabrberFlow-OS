import type { Server } from 'node:http';
import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { PostgresThrottlerStorage } from '../src/security/postgres-throttler.storage';

@Controller('retry-fixture')
@UseGuards(ThrottlerGuard)
class RetryFixtureController {
  @Get()
  read() {
    return { ok: true };
  }
}

describe('Retry-After: real PostgreSQL and HTTP with two independent clients', () => {
  const secret = 'synthetic-retry-e2e-storage-secret';
  const clients = [new PrismaClient(), new PrismaClient()];
  const apps: INestApplication[] = [];
  const digest = (key: string) =>
    createHmac('sha256', secret).update(`default:${key}`).digest('hex');
  const storage = (db: unknown) =>
    new PostgresThrottlerStorage({ db } as PrismaService, secret);
  const hit = (index = 0) =>
    request(apps[index].getHttpServer() as Server).get('/retry-fixture');
  const assertHeader = (header: string) => {
    expect(header).toMatch(/^\d+$/);
    expect(Number(header)).toBeGreaterThanOrEqual(1);
    expect(Number(header)).toBeLessThanOrEqual(60);
  };

  beforeAll(async () => {
    for (const db of clients) {
      const module = await Test.createTestingModule({
        imports: [
          ThrottlerModule.forRoot({
            throttlers: [
              { name: 'default', ttl: 60000, limit: 30, blockDuration: 60000 },
            ],
            storage: storage(db),
          }),
        ],
        controllers: [RetryFixtureController],
      }).compile();
      const app = module.createNestApplication();
      await app.init();
      apps.push(app);
    }
  });
  beforeEach(async () => {
    await clients[0].securityRateBucket.deleteMany();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  afterAll(async () => {
    for (const app of apps) await app.close();
    await Promise.all(clients.map((db) => db.$disconnect()));
  });

  it('new block is 60 seconds and subsequent HTTP headers stay within 1..60', async () => {
    for (let i = 0; i < 30; i++) await hit(i % 2).expect(200);
    const blocked = await hit(1).expect(429);
    expect(blocked.headers['retry-after']).toBe('60');
    assertHeader((await hit().expect(429)).headers['retry-after']);
    const [bucket] = await clients[0].securityRateBucket.findMany();
    expect(bucket.count).toBe(32);
    expect(bucket.key).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(blocked.body)).not.toMatch(
      /Prisma|SecurityRateBucket|127\.0/,
    );
  });

  it('80 concurrent HTTP requests share exactly 30 successes and 50 bounded blocks', async () => {
    const responses = await Promise.all(
      Array.from({ length: 80 }, (_, i) => hit(i % 2)),
    );
    expect(responses.filter((r) => r.status === 200)).toHaveLength(30);
    const blocked = responses.filter((r) => r.status === 429);
    expect(blocked).toHaveLength(50);
    for (const response of blocked)
      assertHeader(response.headers['retry-after']);
    const buckets = await clients[0].securityRateBucket.findMany();
    expect(buckets).toHaveLength(1);
    expect(buckets[0].count).toBe(80);
  });

  it('opposite simulated Node process clocks cannot shorten or extend the HTTP block', async () => {
    for (let i = 0; i < 30; i++) await hit(i % 2).expect(200);
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now');
    for (const [index, offset] of [
      [0, -86_400_000],
      [1, 86_400_000],
    ]) {
      clock.mockReturnValue(now + offset);
      assertHeader((await hit(index).expect(429)).headers['retry-after']);
    }
    expect((await clients[0].securityRateBucket.findMany())[0].count).toBe(32);
  });

  it('two actual Node child processes with opposite clocks share the same PostgreSQL block', async () => {
    const parent = storage(clients[0]);
    for (let i = 0; i < 30; i++)
      await parent.increment('child-clock', 60000, 30, 60000, 'default');
    for (const offset of [-86_400_000, 86_400_000]) {
      const child = spawnSync(
        process.execPath,
        [
          '--require',
          require.resolve('ts-node/register/transpile-only'),
          resolve(__dirname, 'retry-clock-child.cjs'),
        ],
        {
          cwd: resolve(__dirname, '..'),
          env: { ...process.env, RETRY_CLOCK_OFFSET: String(offset) },
          encoding: 'utf8',
          windowsHide: true,
          timeout: 8000,
        },
      );
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(0);
      expect(child.stderr).toBe('');
      const result = JSON.parse(child.stdout) as {
        totalHits: number;
        isBlocked: boolean;
        timeToBlockExpire: number;
      };
      expect(result.isBlocked).toBe(true);
      assertHeader(String(result.timeToBlockExpire));
      expect(result.totalHits).toBe(offset < 0 ? 31 : 32);
    }
    const bucket = await clients[0].securityRateBucket.findUniqueOrThrow({
      where: { key: digest('child-clock') },
    });
    expect(bucket.count).toBe(32);
    // Includes two cold Node/ts-node starts; each child has its own 8s ceiling.
  }, 20000);

  it('an expired window alone cannot clear an active block; both expired reset HTTP budget', async () => {
    for (let i = 0; i < 30; i++) await hit().expect(200);
    await hit(1).expect(429);
    await clients[0].$executeRaw`
      UPDATE "SecurityRateBucket" SET "expiresAt" = NOW() - INTERVAL '1 second'
    `;
    assertHeader((await hit().expect(429)).headers['retry-after']);
    expect((await clients[0].securityRateBucket.findMany())[0].count).toBe(32);
    await clients[0].$executeRaw`
      UPDATE "SecurityRateBucket" SET "blockedUntil" = NOW() - INTERVAL '1 second'
    `;
    const reset = await hit(1).expect(200);
    expect(reset.headers['x-ratelimit-reset']).toBe('60');
    const [bucket] = await clients[0].securityRateBucket.findMany();
    expect(bucket.count).toBe(1);
    expect(bucket.blockedUntil).toBeNull();
  });

  it('rounds a positive submillisecond block up to 1 using the same transaction NOW()', async () => {
    await clients[0].$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "SecurityRateBucket" ("key", "count", "expiresAt", "blockedUntil")
        VALUES (${digest('rounding')}, 31, NOW() - INTERVAL '1 second', NOW() + INTERVAL '0.1 milliseconds')
      `;
      expect(
        await storage(tx).increment('rounding', 60000, 30, 60000, 'default'),
      ).toEqual({
        totalHits: 32,
        timeToExpire: 0,
        isBlocked: true,
        timeToBlockExpire: 1,
      });
    });
  });

  it('resets at the exact PostgreSQL boundary and rounds a 1001ms expiry up to 2', async () => {
    await clients[0].$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "SecurityRateBucket" ("key", "count", "expiresAt", "blockedUntil")
        VALUES (${digest('boundary')}, 31, NOW(), NOW())
      `;
      expect(
        await storage(tx).increment('boundary', 1001, 30, 60000, 'default'),
      ).toEqual({
        totalHits: 1,
        timeToExpire: 2,
        isBlocked: false,
        timeToBlockExpire: 0,
      });
    });
  });

  it('bounds a block committed after a waiting request transaction began', async () => {
    await clients[0].$transaction(async (older) => {
      await older.$queryRaw`SELECT NOW()`;
      // PostgreSQL delay makes the second client's block start newer than older.NOW().
      await clients[1].$queryRaw`SELECT 1 AS ready FROM pg_sleep(0.02)`;
      const other = storage(clients[1]);
      await other.increment('overlap', 60000, 1, 60000, 'default');
      await other.increment('overlap', 60000, 1, 60000, 'default');
      expect(
        await storage(older).increment('overlap', 60000, 1, 60000, 'default'),
      ).toEqual({
        totalHits: 3,
        timeToExpire: 60,
        isBlocked: true,
        timeToBlockExpire: 60,
      });
    });
  });
});
