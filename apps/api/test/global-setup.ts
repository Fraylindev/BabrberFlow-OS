import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  assertIsolatedDatabaseUrl,
  isolatedSchemaName,
} from '../src/common/assert-isolated-database-url';

export default async function globalSetup(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      'E2E tests require DATABASE_URL for an isolated test database.',
    );
  }

  const parsed = assertIsolatedDatabaseUrl(dbUrl);
  const schema = isolatedSchemaName(parsed);

  if (schema) {
    const prisma = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });
    try {
      await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    } finally {
      await prisma.$disconnect();
    }
  }

  execSync('pnpm exec prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
}
