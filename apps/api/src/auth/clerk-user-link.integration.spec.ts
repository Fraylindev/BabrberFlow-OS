import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';

const describePostgres =
  process.env.RUN_POSTGRES_INTEGRATION === '1' ? describe : describe.skip;

type PreMigrationUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  lastOrganizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MigratedUser = PreMigrationUser & {
  clerkUserId: string | null;
};

const migrationStatements = readFileSync(
  resolve(
    process.cwd(),
    'prisma/migrations/20260814190000_add_user_clerk_link_a0_1/migration.sql',
  ),
  'utf8',
)
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

describePostgres(
  'Security A0.1 Clerk user link migration in PostgreSQL',
  () => {
    const prisma = new PrismaClient();

    beforeAll(async () => {
      await prisma.$connect();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    async function withMigratedFixture<T>(
      verify: (
        transaction: Prisma.TransactionClient,
        beforeMigration: PreMigrationUser[],
      ) => Promise<T>,
    ): Promise<T> {
      const schemaName = `a0_1_${randomUUID().replaceAll('-', '_')}`;
      await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);

      try {
        return await prisma.$transaction(async (transaction) => {
          await transaction.$executeRawUnsafe(
            `SET LOCAL search_path TO "${schemaName}"`,
          );
          await transaction.$executeRawUnsafe(`
          CREATE TABLE "User" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "email" TEXT NOT NULL UNIQUE,
            "password" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "lastOrganizationId" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL
          )
        `);

          const fixtureSuffix = randomUUID();
          const createdAt = new Date('2026-01-01T12:00:00.000Z');
          const updatedAt = new Date('2026-01-02T12:00:00.000Z');
          await transaction.$executeRaw`
          INSERT INTO "User" (
            "id", "email", "password", "name",
            "lastOrganizationId", "createdAt", "updatedAt"
          ) VALUES
            (
              ${randomUUID()}, ${`seed-a-${fixtureSuffix}@example.test`},
              ${'fixture-hash-a'}, ${'Seeded identity A'},
              ${randomUUID()}, ${createdAt}, ${updatedAt}
            ),
            (
              ${randomUUID()}, ${`seed-b-${fixtureSuffix}@example.test`},
              ${'fixture-hash-b'}, ${'Seeded identity B'},
              ${null}, ${createdAt}, ${updatedAt}
            )
        `;

          const beforeMigration = await transaction.$queryRaw<
            PreMigrationUser[]
          >`
          SELECT
            "id", "email", "password", "name",
            "lastOrganizationId", "createdAt", "updatedAt"
          FROM "User"
          ORDER BY "id"
        `;

          for (const statement of migrationStatements) {
            await transaction.$executeRawUnsafe(statement);
          }

          return verify(transaction, beforeMigration);
        });
      } finally {
        await prisma.$executeRawUnsafe(
          `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
        );
      }
    }

    it('preserves seeded users and allows multiple null links', async () => {
      await withMigratedFixture(async (transaction, beforeMigration) => {
        const afterMigration = await transaction.$queryRaw<MigratedUser[]>`
        SELECT
          "id", "email", "password", "name", "lastOrganizationId",
          "createdAt", "updatedAt", "clerkUserId"
        FROM "User"
        ORDER BY "id"
      `;

        expect(afterMigration).toHaveLength(2);
        expect(
          afterMigration.map((user) => ({
            id: user.id,
            email: user.email,
            password: user.password,
            name: user.name,
            lastOrganizationId: user.lastOrganizationId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          })),
        ).toEqual(beforeMigration);
        expect(afterMigration.map((user) => user.clerkUserId)).toEqual([
          null,
          null,
        ]);
      });
    });

    it('rejects a duplicate non-null Clerk identity', async () => {
      const duplicateClerkUserId = `user_security_a0_1_${randomUUID()}`;

      try {
        await withMigratedFixture(async (transaction, beforeMigration) => {
          await transaction.$executeRaw`
          UPDATE "User"
          SET "clerkUserId" = ${duplicateClerkUserId}
          WHERE "id" = ${beforeMigration[0].id}
        `;
          await transaction.$executeRaw`
          UPDATE "User"
          SET "clerkUserId" = ${duplicateClerkUserId}
          WHERE "id" = ${beforeMigration[1].id}
        `;
        });
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
          throw error;
        }
        expect(error.code).toBe('P2010');
        expect(error.meta?.code).toBe('23505');
        return;
      }

      throw new Error('PostgreSQL accepted a duplicate Clerk identity');
    });
  },
);
