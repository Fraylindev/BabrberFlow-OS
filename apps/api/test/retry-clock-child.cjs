// Disposable PG18 helper: independent Node clock, no provider or dotenv access.
const { PrismaClient } = require('@prisma/client');
const {
  PostgresThrottlerStorage,
} = require('../src/security/postgres-throttler.storage');
const {
  assertIsolatedDatabaseUrl,
  assertIsolatedDatabaseConnection,
} = require('../src/common/assert-isolated-database-url');
const db = new PrismaClient();
async function main() {
  const expectations = {
    primaryDatabaseName: 'barberflow',
    primaryDatabaseUser: 'barberflow_runtime',
  };
  const parsed = assertIsolatedDatabaseUrl(
    process.env.DATABASE_URL,
    expectations,
  );
  await assertIsolatedDatabaseConnection(db, parsed, expectations);
  const offset = Number(process.env.RETRY_CLOCK_OFFSET);
  if (![-86_400_000, 86_400_000].includes(offset))
    throw Error('Invalid synthetic offset');
  const actualNow = Date.now;
  Date.now = () => actualNow() + offset;
  try {
    const result = await new PostgresThrottlerStorage(
      { db },
      'synthetic-retry-e2e-storage-secret',
    ).increment('child-clock', 60000, 30, 60000, 'default');
    console.log(JSON.stringify(result));
  } finally {
    Date.now = actualNow;
  }
}
main()
  .catch(() => {
    console.error('Isolated retry clock child failed');
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
