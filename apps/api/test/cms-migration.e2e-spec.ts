import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';

// global-setup verifica base _test y propietario sin privilegios.
describe('CMS migración/backfill y restricciones PostgreSQL', () => {
  const db = new PrismaClient();
  const sql = readFileSync(
    resolve(
      __dirname,
      '../prisma/migrations/20260912120000_cms_editorial/migration.sql',
    ),
    'utf8',
  );
  const backfill = sql
    .split('-- BEGIN COMPATIBILITY BACKFILL')[1]
    .split('-- END COMPATIBILITY BACKFILL')[0];
  const rollback = new Error('Sonda aislada revertida');
  afterAll(async () => {
    await db.$disconnect();
  });
  async function createOrg(tx: Prisma.TransactionClient, legacy = false) {
    const suffix = randomUUID();
    if (legacy)
      await tx.$executeRaw`ALTER TABLE "Organization" DISABLE TRIGGER "Organization_initialize_cms"`;
    const org = await tx.organization.create({
      data: {
        name: '  Legacy exacto  ',
        slug: suffix,
        email: `${suffix}@private.test`,
        phone: '(809) 555-0100',
        aboutUs: 'No publicar',
        address: 'No publicar dirección',
        googleMapsUrl: 'javascript:invalid',
        businessHours: { malformed: true },
        isActive: false,
        deletedAt: new Date('2025-01-01T00:00:00Z'),
      },
    });
    if (legacy)
      await tx.$executeRaw`ALTER TABLE "Organization" ENABLE TRIGGER "Organization_initialize_cms"`;
    return org;
  }
  it('preserva columnas legacy exactas, solo copia name/phone y el backfill es repetible', async () => {
    await expect(
      db.$transaction(async (tx) => {
        const org = await createOrg(tx, true);
        expect(
          await tx.cmsPage.findUnique({ where: { organizationId: org.id } }),
        ).toBeNull();
        await tx.$executeRawUnsafe(backfill);
        const page = await tx.cmsPage.findUniqueOrThrow({
          where: { organizationId: org.id },
        });
        expect(page.publishedSnapshot).toEqual({
          publicName: org.name,
          phone: org.phone,
          description: null,
          address: null,
          googleMapsUrl: null,
        });
        expect(page.draft).toEqual(page.publishedSnapshot);
        expect(page).toMatchObject({
          version: 0,
          draftRevision: 0,
          publishedRevision: 0,
          isPublished: true,
        });
        await tx.$executeRawUnsafe(backfill);
        expect(
          await tx.cmsPage.findUnique({ where: { organizationId: org.id } }),
        ).toEqual(page);
        expect(
          await tx.organization.findUnique({ where: { id: org.id } }),
        ).toEqual(org);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });
  it('backfill posterior no publica tenants nuevos ni revive retiradas', async () => {
    await expect(
      db.$transaction(async (tx) => {
        const old = await createOrg(tx, true);
        await tx.$executeRawUnsafe(backfill);
        await tx.cmsPage.update({
          where: { organizationId: old.id },
          data: { isPublished: false, version: 1 },
        });
        const fresh = await createOrg(tx);
        const before = await tx.cmsPage.findMany({
          where: { organizationId: { in: [old.id, fresh.id] } },
          orderBy: { organizationId: 'asc' },
        });
        await tx.$executeRawUnsafe(backfill);
        const after = await tx.cmsPage.findMany({
          where: { organizationId: { in: [old.id, fresh.id] } },
          orderBy: { organizationId: 'asc' },
        });
        expect(after).toEqual(before);
        expect(after.every((page) => !page.isPublished)).toBe(true);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });
  it.each([
    { version: -1 },
    { draftRevision: 1 },
    { isPublished: true },
    { publishedRevision: 0 },
    { publishedSnapshot: { publicName: 'invalid' } },
  ])('PostgreSQL rechaza estado inconsistente %j', async (data) => {
    await expect(
      db.$transaction(async (tx) => {
        const org = await createOrg(tx);
        await tx.cmsPage.update({ where: { organizationId: org.id }, data });
      }),
    ).rejects.toThrow();
  });
});
