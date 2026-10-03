const { PrismaClient } = require('@prisma/client');
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const assert = require('node:assert/strict');
const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '55439' || url.pathname !== '/kortek_m2_test' || url.username !== 'm2_runner') throw new Error('Se requiere DB M2 desechable');
const db = new PrismaClient();
async function main() {
  const constraints = await db.$queryRaw`SELECT conname AS name FROM pg_constraint WHERE conrelid IN ('"CustomerOperation"'::regclass, '"Client"'::regclass) ORDER BY conname`;
  const indexes = await db.$queryRaw`SELECT indexname AS name FROM pg_indexes WHERE tablename IN ('CustomerOperation','Booking') ORDER BY indexname`;
  const triggers = await db.$queryRaw`SELECT tgname AS name, tgenabled AS enabled FROM pg_trigger WHERE tgname IN ('Booking_customer_revision','Client_customer_access_relink') ORDER BY tgname`;
  const migrations = await db.$queryRaw`SELECT COUNT(*)::int AS count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL`;
  for (const name of ['CustomerOperation_valid_check', 'CustomerOperation_bookingId_organizationId_fkey', 'CustomerOperation_clientId_organizationId_fkey', 'CustomerOperation_actorUserId_fkey', 'CustomerOperation_organizationId_fkey', 'Client_customer_revision_check']) assert.ok(constraints.some(row => row.name === name), name);
  assert.ok(indexes.some(row => row.name === 'CustomerOperation_context_key'));
  assert.ok(indexes.some(row => row.name === 'Booking_customer_page_idx'));
  assert.equal(triggers.length, 2); assert.ok(triggers.every(row => row.enabled === 'O'));
  assert.equal(migrations[0].count, 28);
  const result = { migrations: 28, constraints, indexes, triggers, checked: true };
  writeFileSync(resolve(__dirname, '../../../docs/quality/evidence/m2-c1/database-invariants.json'), JSON.stringify(result, null, 2) + '\n');
  console.log('28 migraciones, unicidad contextual, FKs, CHECKs, índice paginado y ambos triggers habilitados: comprobados.');
}
main().finally(() => db.$disconnect()).catch(error => { console.error(JSON.stringify({ errorClass: error.constructor.name, code: error.code ?? null })); process.exitCode = 1; });
