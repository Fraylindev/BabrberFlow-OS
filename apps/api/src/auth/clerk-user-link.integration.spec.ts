import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const describePostgres =
  process.env.RUN_POSTGRES_INTEGRATION === '1' ? describe : describe.skip;

describePostgres('Security A0.1 Clerk user link in PostgreSQL', () => {
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterEach(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
      createdUserIds.length = 0;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('preserves the 19 existing users as unlinked identities', async () => {
    const users = await prisma.user.findMany({
      select: { id: true, clerkUserId: true },
    });

    expect(users).toHaveLength(19);
    expect(users.every((user) => user.clerkUserId === null)).toBe(true);
  });

  it('allows multiple users to remain unlinked', async () => {
    const suffix = randomUUID();
    const users = await Promise.all([
      prisma.user.create({
        data: {
          email: `clerk-null-a-${suffix}@example.test`,
          name: 'Clerk link integration A',
          password: 'integration-fixture-only',
        },
      }),
      prisma.user.create({
        data: {
          email: `clerk-null-b-${suffix}@example.test`,
          name: 'Clerk link integration B',
          password: 'integration-fixture-only',
        },
      }),
    ]);
    createdUserIds.push(...users.map((user) => user.id));

    expect(users.map((user) => user.clerkUserId)).toEqual([null, null]);
  });

  it('rejects a duplicate non-null Clerk identity', async () => {
    const suffix = randomUUID();
    const clerkUserId = `user_security_a0_1_${suffix}`;
    const first = await prisma.user.create({
      data: {
        clerkUserId,
        email: `clerk-unique-a-${suffix}@example.test`,
        name: 'Clerk unique integration A',
        password: 'integration-fixture-only',
      },
    });
    createdUserIds.push(first.id);

    await expect(
      prisma.user.create({
        data: {
          clerkUserId,
          email: `clerk-unique-b-${suffix}@example.test`,
          name: 'Clerk unique integration B',
          password: 'integration-fixture-only',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await expect(prisma.user.count({ where: { clerkUserId } })).resolves.toBe(
      1,
    );
  });
});
