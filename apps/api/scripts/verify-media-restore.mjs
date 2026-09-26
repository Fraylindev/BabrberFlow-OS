import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const sourceUrl = process.env.MEDIA_SOURCE_DATABASE_URL;
const restoreUrl = process.env.MEDIA_RESTORE_DATABASE_URL;
if (!sourceUrl || !restoreUrl || sourceUrl === restoreUrl) {
  throw new Error('Se requieren dos URLs de bases QA distintas.');
}
if (
  !new URL(sourceUrl).pathname.endsWith('_test') ||
  !new URL(restoreUrl).pathname.endsWith('_test')
) {
  throw new Error('La verificación solo admite bases con sufijo _test.');
}

async function snapshot(url) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const [assets, promotions, jobs, migrations] = await Promise.all([
      prisma.mediaAsset.findMany({
        select: {
          id: true,
          organizationId: true,
          purpose: true,
          status: true,
          publishedRevision: true,
        },
        orderBy: { id: 'asc' },
      }),
      prisma.mediaPromotion.findMany({
        select: {
          id: true,
          organizationId: true,
          version: true,
          isPublished: true,
        },
        orderBy: { id: 'asc' },
      }),
      prisma.mediaPurgeJob.findMany({
        select: { assetId: true, organizationId: true, completedAt: true },
        orderBy: { assetId: 'asc' },
      }),
      prisma.$queryRaw`SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`,
    ]);
    const state = {
      assets,
      promotions,
      jobs: jobs.map((job) => ({
        ...job,
        completedAt: job.completedAt?.toISOString() ?? null,
      })),
      migrations: migrations[0]?.count,
    };
    return {
      counts: {
        assets: assets.length,
        promotions: promotions.length,
        jobs: jobs.length,
        migrations: state.migrations,
      },
      hash: createHash('sha256').update(JSON.stringify(state)).digest('hex'),
    };
  } finally {
    await prisma.$disconnect();
  }
}

const [source, restore] = await Promise.all([
  snapshot(sourceUrl),
  snapshot(restoreUrl),
]);
console.log(JSON.stringify({ source, restore }));
if (source.hash !== restore.hash || source.counts.migrations !== 25) {
  throw new Error('El respaldo restaurado no coincide con la fuente C1.');
}
