// Ensayo de upgrade: ejecutar solo en un clúster desechable local.
const { PrismaClient } = require('@prisma/client');
const { randomUUID, createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '55439' || url.pathname !== '/kortek_m2_upgrade_test' || url.username !== 'm2_runner') {
  throw new Error('Este ensayo exige el contenedor M2 desechable exclusivo');
}
const file = resolve(__dirname, '../../../.tmp/m2-c1/upgrade-fixture.json');
const db = new PrismaClient();
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

async function snapshot(ids) {
  const user = await db.user.findUnique({ where: { id: ids.user }, select: { id: true, clerkUserId: true, email: true, password: true } });
  const client = await db.client.findUnique({ where: { id: ids.client }, select: { id: true, organizationId: true, userId: true, name: true, email: true, phone: true, isActive: true } });
  const booking = await db.booking.findUnique({ where: { id: ids.booking }, select: { id: true, organizationId: true, clientId: true, serviceId: true, professionalId: true, startTime: true, endTime: true, status: true } });
  return { user: hash(user), client: hash(client), booking: hash(booking) };
}

async function main() {
  if (process.argv[2] === 'prepare') {
    const ids = { organization: randomUUID(), user: randomUUID(), client: randomUUID(), service: randomUUID(), professional: randomUUID(), booking: randomUUID() };
    await db.user.create({ data: { id: ids.user, clerkUserId: `m2_test_${ids.user}`, name: 'Upgrade sintético', email: `${ids.user}@test.invalid`, password: 'synthetic-baseline-only' }, select: { id: true } });
    await db.organization.create({ data: { id: ids.organization, slug: ids.organization, name: 'Upgrade M2', email: `${ids.organization}@test.invalid` }, select: { id: true } });
    await db.$executeRaw`INSERT INTO "Client" ("id", "organizationId", "userId", "name", "email", "updatedAt") VALUES (${ids.client}, ${ids.organization}, ${ids.user}, 'Upgrade M2', 'upgrade@test.invalid', NOW())`;
    await db.service.create({ data: { id: ids.service, organizationId: ids.organization, name: 'Upgrade servicio', duration: 30, price: 100 }, select: { id: true } });
    await db.professional.create({ data: { id: ids.professional, organizationId: ids.organization, name: 'Upgrade profesional', status: 'ACTIVE', isPublic: true }, select: { id: true } });
    await db.booking.create({ data: { id: ids.booking, organizationId: ids.organization, clientId: ids.client, serviceId: ids.service, professionalId: ids.professional, startTime: new Date('2099-03-01T13:00:00Z'), endTime: new Date('2099-03-01T13:30:00Z') }, select: { id: true } });
    writeFileSync(file, JSON.stringify({ ids, baseline: await snapshot(ids) }, null, 2));
    console.log('Fixture baseline: vínculo Clerk, password legacy y Booking PENDING sintéticos; huellas guardadas, sin PII.');
    return;
  }
  const fixture = JSON.parse(readFileSync(file, 'utf8'));
  const current = await snapshot(fixture.ids);
  if (JSON.stringify(current) !== JSON.stringify(fixture.baseline)) throw new Error('El upgrade alteró datos originales');
  if (process.argv[2] === 'verify-upgrade') {
    const client = await db.client.findUniqueOrThrow({ where: { id: fixture.ids.client } });
    if (!client.customerAccessBlocked || client.customerHistoryAmbiguous || client.customerBookingRevision !== 0n) throw new Error('Defaults D4/cursor incorrectos');
    const created = await db.booking.create({ data: { organizationId: fixture.ids.organization, clientId: fixture.ids.client, serviceId: fixture.ids.service, professionalId: fixture.ids.professional, startTime: new Date('2099-03-02T13:00:00Z'), endTime: new Date('2099-03-02T13:30:00Z') }, select: { id: true } });
    fixture.newBooking = created.id;
    await db.customerOperation.create({ data: { organizationId: fixture.ids.organization, actorUserId: fixture.ids.user, clientId: fixture.ids.client, operation: 'CREATE_BOOKING', keyDigest: 'a'.repeat(64), commandDigest: 'b'.repeat(64), bookingId: created.id, createdAt: new Date(), expiresAt: new Date(Date.now() + 86000000) } });
    writeFileSync(file, JSON.stringify(fixture, null, 2));
  }
  if (fixture.newBooking && !(await db.booking.findUnique({ where: { id: fixture.newBooking }, select: { id: true } }))) throw new Error('Rollback perdió reserva posterior');
  const migrations = await db.$queryRaw`SELECT COUNT(*)::int AS count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL`;
  console.log(JSON.stringify({ mode: process.argv[2], preservedBaseline: true, preservedNewBooking: Boolean(fixture.newBooking), migrations: migrations[0].count }));
}
main().finally(() => db.$disconnect()).catch(error => { console.error(JSON.stringify({ errorClass: error.constructor.name, code: error.code ?? null, column: error.meta?.column ?? null })); process.exitCode = 1; });
