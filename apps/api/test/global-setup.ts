import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  assertIsolatedDatabaseConnection,
  assertIsolatedDatabaseUrl,
} from '../src/common/assert-isolated-database-url';

export default async function globalSetup(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      'E2E tests require DATABASE_URL for an isolated test database.',
    );
  }

  const primaryDatabaseName = process.env.E2E_PRIMARY_DATABASE_NAME;
  const primaryDatabaseUser = process.env.E2E_PRIMARY_DATABASE_USER;
  if (!primaryDatabaseName || !primaryDatabaseUser) {
    throw new Error(
      'E2E requires E2E_PRIMARY_DATABASE_NAME and E2E_PRIMARY_DATABASE_USER.',
    );
  }

  const expectations = { primaryDatabaseName, primaryDatabaseUser };
  const parsed = assertIsolatedDatabaseUrl(dbUrl, expectations);
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });
  try {
    await prisma.$connect();
    await assertIsolatedDatabaseConnection(prisma, parsed, expectations);
  } finally {
    await prisma.$disconnect();
  }

  execSync('pnpm exec prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
}
