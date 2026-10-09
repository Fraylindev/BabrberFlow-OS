// Datos y planes exclusivamente en kortek_m2_test desechable.
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '55439' || url.pathname !== '/kortek_m2_test' || url.username !== 'm2_runner') throw new Error('Se requiere DB M2 desechable');
const db = new PrismaClient();

async function main() {
  const tenant = randomUUID(); const actor = randomUUID(); const service = randomUUID(); const professional = randomUUID();
  await db.organization.create({ data: { id: tenant, slug: tenant, name: 'EXPLAIN sintético', email: `${tenant}@test.invalid` }, select: { id: true } });
  await db.user.create({ data: { id: actor, name: 'EXPLAIN sintético', email: `${actor}@test.invalid`, clerkUserId: `m2_test_${actor}` }, select: { id: true } });
  await db.service.create({ data: { id: service, organizationId: tenant, name: 'EXPLAIN servicio', duration: 30, price: 100 }, select: { id: true } });
  await db.professional.create({ data: { id: professional, organizationId: tenant, name: 'EXPLAIN profesional' }, select: { id: true } });
  await db.$executeRaw`INSERT INTO "Client" ("id", "organizationId", "userId", "name", "customerAccessBlocked", "updatedAt") SELECT ${tenant} || '-client-' || g, ${tenant}, CASE WHEN g=1 THEN ${actor} ELSE NULL END, 'Plan sintético', false, NOW() FROM generate_series(1, 50) g`;
  const client = `${tenant}-client-1`;
  await db.$executeRaw`INSERT INTO "Booking" ("id", "organizationId", "clientId", "serviceId", "professionalId", "startTime", "endTime", "status", "updatedAt") SELECT ${tenant} || '-booking-' || g, ${tenant}, ${tenant} || '-client-' || ((g-1) / 1000 + 1), ${service}, ${professional}, TIMESTAMP '2099-01-01' + g * INTERVAL '30 minutes', TIMESTAMP '2099-01-01' + (g+1) * INTERVAL '30 minutes', (ARRAY['PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW']::"BookingStatus"[])[(g % 5)+1], NOW() FROM generate_series(1, 50000) g`;
  await db.$executeRawUnsafe('ANALYZE "Booking"'); await db.$executeRawUnsafe('ANALYZE "Client"');
  const plans = {};
  for (const view of ['upcoming', 'history']) {
    const predicate = view === 'upcoming' ? `b."status" IN ('PENDING','CONFIRMED') AND b."endTime" > NOW()` : `(b."status" NOT IN ('PENDING','CONFIRMED') OR b."endTime" <= NOW())`;
    const order = view === 'upcoming' ? 'ASC' : 'DESC';
    const op = view === 'upcoming' ? '>' : '<';
    const rows = await db.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT b."id", b."startTime", b."endTime", b."status" FROM "Booking" b WHERE b."organizationId"=$1 AND b."clientId"=$2 AND EXISTS (SELECT 1 FROM "Client" c WHERE c."id"=b."clientId" AND c."organizationId"=b."organizationId" AND c."userId"=$3 AND NOT c."customerAccessBlocked" AND NOT c."customerHistoryAmbiguous") AND ${predicate} AND (b."startTime" ${op} TIMESTAMP '2099-01-10' OR (b."startTime" = TIMESTAMP '2099-01-10' AND b."id" ${op} 'pivot')) ORDER BY b."startTime" ${order}, b."id" ${order} LIMIT 21`, tenant, client, actor);
    plans[view] = rows[0]['QUERY PLAN'][0];
    if (!JSON.stringify(plans[view]).includes('Booking_customer_page_idx')) throw new Error(`Plan ${view} no justifica el índice`);
    console.log(JSON.stringify({ view, fixtureBookings: 50000, fixtureClients: 50, requestedRows: 21, executionMs: plans[view]['Execution Time'], index: 'Booking_customer_page_idx' }));
  }
  // Sanitizar identificadores de fixture: los planes solo conservan alias.
  const safe = JSON.stringify(plans, null, 2).replaceAll(tenant, 'tenant-sintetico').replaceAll(actor, 'actor-sintetico');
  writeFileSync(resolve(__dirname, '../../../docs/quality/evidence/m2-c1/query-plans.json'), safe + '\n');
}
main().finally(() => db.$disconnect()).catch(error => { console.error(JSON.stringify({ errorClass: error.constructor.name, code: error.code ?? null })); process.exitCode = 1; });
