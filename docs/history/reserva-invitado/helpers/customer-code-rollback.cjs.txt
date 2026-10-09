// Requiere copia git archive del HEAD base en .tmp/m2-c1/baseline.
const { PrismaClient } = require('@prisma/client');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const assert = require('node:assert/strict');
const request = require('supertest');
const root = resolve(__dirname, '../../../.tmp/m2-c1');
const baseline = resolve(root, 'baseline/apps/api');
const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '55439' || url.pathname !== '/kortek_m2_upgrade_test' || url.username !== 'm2_runner') throw new Error('Se requiere DB M2 desechable');
const { createE2eApp } = require(resolve(baseline, 'test/create-e2e-app.ts'));
const { ClerkSessionVerifierService } = require(resolve(baseline, 'src/auth/clerk/clerk-session-verifier.service.ts'));
const { MediaPurgeWorker } = require(resolve(baseline, 'src/media/media-purge.worker.ts'));
const db = new PrismaClient();
let app;

async function main() {
  const fixture = JSON.parse(readFileSync(resolve(root, 'upgrade-fixture.json'), 'utf8'));
  const ids = fixture.ids;
  const user = await db.user.findUniqueOrThrow({ where: { id: ids.user }, select: { clerkUserId: true, email: true } });
  await db.businessSchedule.create({ data: { organizationId: ids.organization, state: 'CONFIRMED', zoneConfirmed: true, days: { create: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, windows: { create: { startMinute: 540, endMinute: 1080 } } })) } } });
  await db.cmsPage.update({ where: { organizationId: ids.organization }, data: { isPublished: true, publishedRevision: 0, publishedSnapshot: { publicName: 'Rollback sintético', description: null, phone: null, address: null, googleMapsUrl: null } } });
  const receipts = await db.customerOperation.count();
  app = await createE2eApp(builder => builder.overrideProvider(ClerkSessionVerifierService).useValue({
    verify() { return Promise.resolve({ clerkUserId: user.clerkUserId, sessionId: 'synthetic-rollback-session' }); },
    getClient() { return { users: { getUser() { return Promise.resolve({ id: user.clerkUserId, firstName: 'Rollback', lastName: 'Sintético', username: null, primaryEmailAddressId: 'synthetic-email', emailAddresses: [{ id: 'synthetic-email', emailAddress: user.email, verification: { status: 'verified' } }] }); } } }; },
  }).overrideProvider(MediaPurgeWorker).useValue({ onModuleInit() {}, onModuleDestroy() {} }));
  app.useLogger(false);
  await request(app.getHttpServer()).get(`/public/${ids.organization}/booking-data`).expect(200);
  await request(app.getHttpServer()).post('/auth/clerk/customer/claims').auth('synthetic-rollback', { type: 'bearer' }).send({ bookingId: ids.booking, organizationSlug: ids.organization }).expect(200, { claimed: true });
  const result = await request(app.getHttpServer()).post(`/public/${ids.organization}/bookings`).send({ serviceId: ids.service, professionalId: ids.professional, startTime: '2099-03-03T13:00:00Z', clientName: 'Upgrade M2', clientEmail: 'upgrade@test.invalid', clientPhone: '+18095550301' }).expect(201);
  assert.equal(result.body.booking.status, 'PENDING');
  assert.equal(await db.customerOperation.count(), receipts);
  assert.equal((await db.client.findUniqueOrThrow({ where: { id: ids.client } })).userId, ids.user);
  assert.ok(await db.booking.findUnique({ where: { id: fixture.newBooking }, select: { id: true } }));
  await request(app.getHttpServer()).get('/customer/businesses').expect(404);
  console.log(JSON.stringify({ baselineCode: '61ec6677b448a2ebbab4c32298b9246347ec1a10', additiveSchema: true, publicRead: 200, repeatedClaim: 200, publicBooking: 201, receiptsPreserved: true, linksPreserved: true, postUpgradeBookingPreserved: true, m2RoutesAbsent: true }));
}
main().finally(async () => { if (app) await app.close(); await db.$disconnect(); }).catch(error => { console.error(JSON.stringify({ errorClass: error.constructor.name, code: error.code ?? null })); process.exitCode = 1; });
