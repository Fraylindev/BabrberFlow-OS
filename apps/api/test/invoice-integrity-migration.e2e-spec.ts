import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';

// global-setup enforces an isolated non-privileged database before any test.
describe('Invoice integrity forward repair (isolated PostgreSQL)', () => {
  const db = new PrismaClient();
  const migration = readFileSync(
    resolve(
      __dirname,
      '../prisma/migrations/20260909120000_restore_invoice_integrity_checks/migration.sql',
    ),
    'utf8',
  )
    .replace(/^BEGIN;\s*/, '')
    .replace(/\s*COMMIT;\s*$/, '');
  const rolledBack = new Error('Synthetic probe rolled back');

  afterAll(async () => {
    await db.$disconnect();
  });

  async function withoutChecks(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_amount_positive_check"`;
    await tx.$executeRaw`ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_currency_dop_check"`;
  }

  async function invoice(
    tx: Prisma.TransactionClient,
    amount: string,
    currency: string,
  ) {
    const suffix = randomUUID();
    const organization = await tx.organization.create({
      data: {
        name: 'Synthetic integrity probe',
        slug: suffix,
        email: `${suffix}@example.test`,
      },
    });
    const service = await tx.service.create({
      data: {
        organizationId: organization.id,
        name: 'Synthetic service',
        price: '125.50',
        duration: 30,
      },
    });
    const client = await tx.client.create({
      data: {
        organizationId: organization.id,
        name: 'Synthetic client',
      },
    });
    const professional = await tx.professional.create({
      data: {
        organizationId: organization.id,
        name: 'Synthetic professional',
      },
    });
    const booking = await tx.booking.create({
      data: {
        organizationId: organization.id,
        clientId: client.id,
        professionalId: professional.id,
        serviceId: service.id,
        status: 'COMPLETED',
        startTime: new Date('2026-01-01T12:00:00Z'),
        endTime: new Date('2026-01-01T12:30:00Z'),
      },
    });
    return tx.invoice.create({
      data: {
        organizationId: organization.id,
        bookingId: booking.id,
        amount,
        currency,
      },
    });
  }

  it('is repeatable on a fully migrated schema', async () => {
    await expect(
      db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(migration);
        await tx.$executeRawUnsafe(migration);
        throw rolledBack;
      }),
    ).rejects.toBe(rolledBack);
  });

  it('restores missing checks without modifying a valid historical invoice', async () => {
    await expect(
      db.$transaction(async (tx) => {
        await withoutChecks(tx);
        const before = await invoice(tx, '125.50', 'DOP');
        await tx.$executeRawUnsafe(migration);
        const checks = await tx.$queryRaw<{ convalidated: boolean }[]>`
        SELECT convalidated FROM pg_constraint
        WHERE conrelid = 'public."Invoice"'::regclass
        AND conname IN ('Invoice_amount_positive_check', 'Invoice_currency_dop_check')
      `;
        expect(checks).toHaveLength(2);
        expect(checks.every((check) => check.convalidated)).toBe(true);
        expect(
          await tx.invoice.findUnique({ where: { id: before.id } }),
        ).toEqual(before);
        throw rolledBack;
      }),
    ).rejects.toBe(rolledBack);
  });

  it.each([
    ['0', 'DOP'],
    ['-1.00', 'DOP'],
    ['125.50', 'USD'],
  ])(
    'fails closed for invalid history (%s, %s), without normalization',
    async (amount, currency) => {
      await expect(
        db.$transaction(async (tx) => {
          await withoutChecks(tx);
          await invoice(tx, amount, currency);
          await tx.$executeRawUnsafe(migration);
        }),
      ).rejects.toThrow('invalid existing rows require explicit resolution');
    },
  );

  it('does not trust an existing check by name alone', async () => {
    await expect(
      db.$transaction(async (tx) => {
        await withoutChecks(tx);
        await tx.$executeRaw`ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_amount_positive_check" CHECK (amount >= 0)`;
        await tx.$executeRawUnsafe(migration);
      }),
    ).rejects.toThrow('unexpected amount constraint definition');
  });
});
