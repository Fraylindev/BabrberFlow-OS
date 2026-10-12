const { PrismaClient } = require('@prisma/client');
const {
  PostgresThrottlerStorage,
} = require('../dist/security/postgres-throttler.storage');
if (new URL(process.env.DATABASE_URL).hostname !== '127.0.0.1')
  throw new Error('Local cluster only');
const db = new PrismaClient();
(async () => {
  const storage = new PostgresThrottlerStorage(
    { db },
    process.env.RATE_LIMIT_SECRET,
  );
  const [key, limit, total] = process.argv.slice(2);
  const started = Date.now();
  const hits = await Promise.all(
    Array.from({ length: Number(total) }, () =>
      storage.increment(
        key,
        60000,
        Number(limit),
        60000,
        'm3-' + process.env.M3_BUDGET,
      ),
    ),
  );
  console.log(
    JSON.stringify({
      accepted: hits.filter((h) => !h.isBlocked).length,
      blocked: hits.filter((h) => h.isBlocked).length,
      retries: hits.filter((h) => h.isBlocked).map((h) => h.timeToBlockExpire),
      elapsed: Date.now() - started,
    }),
  );
})()
  .catch(() => {
    process.exitCode = 1;
    console.error('Isolated budget test failed');
  })
  .finally(() => db.$disconnect());
