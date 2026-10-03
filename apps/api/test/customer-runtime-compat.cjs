// Hijo del drill P1: API anterior exacta sobre schema 28 y login runtime local.
const assert = require('node:assert/strict');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const request = require('supertest');
const endpoint = new URL(process.env.DATABASE_URL);
if (
  endpoint.hostname !== '127.0.0.1' ||
  endpoint.port !== '55447' ||
  endpoint.pathname !== '/kortek_m2_c3_test' ||
  endpoint.username !== 'kortek_runtime'
)
  throw new Error('Compatibilidad exige destino desechable P1');
const priorApi = path.resolve(process.env.P1_PREVIOUS_API);
if (!priorApi.includes(`${path.sep}.tmp${path.sep}m2-c3-p1${path.sep}`))
  throw new Error('Compatibilidad exige copia aislada del API anterior');
const ids = JSON.parse(process.env.P1_FIXTURE);
const { createE2eApp } = require(path.join(priorApi, 'test/create-e2e-app.ts'));
const { ClerkSessionVerifierService } = require(
  path.join(priorApi, 'src/auth/clerk/clerk-session-verifier.service.ts'),
);
const { MediaPurgeWorker } = require(
  path.join(priorApi, 'src/media/media-purge.worker.ts'),
);
const db = new PrismaClient({ log: [] });
let app;
let phase = 'runtime';
async function main() {
  const role = await db.$queryRawUnsafe('SELECT current_user AS role');
  assert.equal(role[0].role, 'kortek_runtime');
  const user = await db.user.findUniqueOrThrow({
    where: { id: ids.user },
    select: { clerkUserId: true, email: true },
  });
  phase = 'schedule';
  await db.businessSchedule.create({
    data: {
      organizationId: ids.organization,
      state: 'CONFIRMED',
      zoneConfirmed: true,
      days: {
        create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          windows: { create: { startMinute: 540, endMinute: 1080 } },
        })),
      },
    },
  });
  phase = 'cms';
  await db.cmsPage.upsert({
    where: { organizationId: ids.organization },
    create: {
      organizationId: ids.organization,
      draft: {},
      isPublished: true,
      publishedRevision: 0,
      publishedSnapshot: {
        publicName: 'P1 sintético',
        description: null,
        phone: null,
        address: null,
        googleMapsUrl: null,
      },
    },
    update: {
      isPublished: true,
      publishedRevision: 0,
      publishedSnapshot: {
        publicName: 'P1 sintético',
        description: null,
        phone: null,
        address: null,
        googleMapsUrl: null,
      },
    },
  });
  const receipts = await db.customerOperation.count();
  const beforeBookings = await db.booking.count();
  phase = 'app';
  app = await createE2eApp((builder) =>
    builder
      .overrideProvider(ClerkSessionVerifierService)
      .useValue({
        verify() {
          return Promise.resolve({
            clerkUserId: user.clerkUserId,
            sessionId: 'synthetic-p1-session',
          });
        },
        getClient() {
          return {
            users: {
              getUser() {
                return Promise.resolve({
                  id: user.clerkUserId,
                  firstName: 'P1',
                  lastName: 'Sintético',
                  username: null,
                  primaryEmailAddressId: 'synthetic-email',
                  emailAddresses: [
                    {
                      id: 'synthetic-email',
                      emailAddress: user.email,
                      verification: { status: 'verified' },
                    },
                  ],
                });
              },
            },
          };
        },
      })
      .overrideProvider(MediaPurgeWorker)
      .useValue({ onModuleInit() {}, onModuleDestroy() {} }),
  );
  app.useLogger(false);
  phase = 'public-read';
  await request(app.getHttpServer())
    .get(`/public/${ids.organization}/booking-data`)
    .expect(200);
  phase = 'claim';
  await request(app.getHttpServer())
    .post('/auth/clerk/customer/claims')
    .auth('synthetic-p1', { type: 'bearer' })
    .send({ bookingId: ids.booking, organizationSlug: ids.organization })
    .expect(200, { claimed: true });
  phase = 'public-booking';
  const result = await request(app.getHttpServer())
    .post(`/public/${ids.organization}/bookings`)
    .send({
      serviceId: ids.service,
      professionalId: ids.professional,
      startTime: '2099-03-03T13:00:00Z',
      clientName: 'P1 sintético',
      clientEmail: 'client@test.invalid',
      clientPhone: '+18095550447',
    })
    .expect(201);
  assert.equal(result.body.booking.status, 'PENDING');
  assert.equal(await db.customerOperation.count(), receipts);
  assert.equal(await db.booking.count(), beforeBookings + 1);
  assert.ok(
    await db.booking.findUnique({
      where: { id: ids.postUpgradeBooking },
      select: { id: true },
    }),
  );
  const client = await db.client.findUniqueOrThrow({
    where: { id: ids.client },
  });
  assert.equal(client.userId, ids.user);
  assert.equal(client.customerAccessBlocked, true);
  await request(app.getHttpServer()).get('/customer/businesses').expect(404);
  console.log(
    JSON.stringify({
      runtime: 'kortek_runtime',
      publicRead: 200,
      repeatedClaim: 200,
      publicBooking: 201,
      pendingBooking: true,
      receiptsPreserved: true,
      postUpgradeBookingPreserved: true,
      linkPreserved: true,
      oldApiDoesNotUnblock: true,
      m2RoutesAbsent: true,
    }),
  );
}
main()
  .finally(async () => {
    if (app) await app.close();
    await db.$disconnect();
  })
  .catch((error) => {
    console.error(
      JSON.stringify({
        phase,
        errorClass: error.constructor.name,
        code: error.code ?? null,
        model: error.meta?.modelName ?? null,
        target: error.meta?.target ?? null,
      }),
    );
    process.exitCode = 1;
  });
