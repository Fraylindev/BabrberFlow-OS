import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ClerkSessionVerifierService } from '../src/auth/clerk/clerk-session-verifier.service';
import { createE2eApp, requestApp } from './create-e2e-app';

const PATH = '/organizations/mine/schedule';
const week = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  windows: [
    { startTime: '09:00', endTime: '12:00' },
    { startTime: '13:00', endTime: '24:00' },
  ],
}));
describe('C1 HTTP: real guards, DTOs, runtime and two tenants', () => {
  let app: INestApplication;
  const originalUrl = process.env.DATABASE_URL;
  const fixtures = new PrismaClient();
  const identities = new Set<string>();
  let tenant: { id: string; slug: string }, other: { id: string; slug: string };
  let actors: Record<string, { id: string; token: string }>;
  const verifier = {
    verify: jest.fn((req: globalThis.Request) => {
      const token = req.headers
        .get('authorization')
        ?.replace(/^Bearer\s+/i, '');
      if (!token || !identities.has(token))
        throw new UnauthorizedException('Sesión no válida');
      return Promise.resolve({
        clerkUserId: token,
        sessionId: `controlled-${token}`,
      });
    }),
  };
  beforeAll(async () => {
    if (process.env.C1_RUNTIME_DATABASE_URL)
      process.env.DATABASE_URL = process.env.C1_RUNTIME_DATABASE_URL;
    app = await createE2eApp((b) =>
      b.overrideProvider(ClerkSessionVerifierService).useValue(verifier),
    );
  });
  afterAll(async () => {
    await app.close();
    await fixtures.$disconnect();
    process.env.DATABASE_URL = originalUrl;
  });
  beforeEach(async () => {
    const create = () => {
      const id = randomUUID();
      return fixtures.organization.create({
        data: {
          id,
          name: 'C1 HTTP business',
          slug: id,
          email: `${id}@test.invalid`,
          businessSchedule: { create: {} },
        },
      });
    };
    [tenant, other] = await Promise.all([create(), create()]);
    actors = {};
    for (const role of Object.values(UserRole)) {
      const token = randomUUID();
      const user = await fixtures.user.create({
        data: {
          name: role,
          email: `${token}@test.invalid`,
          clerkUserId: token,
          memberships: { create: { organizationId: tenant.id, role } },
        },
      });
      actors[role] = { id: user.id, token };
      identities.add(token);
    }
  });
  const auth = (role = 'OWNER', id = tenant.id) => ({
    Authorization: `Bearer ${actors[role].token}`,
    'x-organization-id': id,
  });
  async function confirm() {
    await requestApp(app)
      .post(`${PATH}/zone`)
      .set(auth())
      .send({ expectedRevision: 0, regionId: 'santo-domingo' })
      .expect(201);
    await requestApp(app)
      .put(`${PATH}/week`)
      .set(auth('ADMIN'))
      .send({ expectedRevision: 1, week })
      .expect(200);
  }
  it('denies missing session, CUSTOMER and foreign organization; permits only minimal staff reading', async () => {
    await requestApp(app).get(PATH).expect(401);
    for (const role of ['OWNER', 'ADMIN', 'RECEPTIONIST', 'BARBER'])
      await requestApp(app).get(PATH).set(auth(role)).expect(200);
    await requestApp(app).get(PATH).set(auth('CUSTOMER')).expect(403);
    await requestApp(app).get(PATH).set(auth('OWNER', other.id)).expect(401);
    const regions = await requestApp(app)
      .get(`${PATH}/regions`)
      .set(auth('BARBER'))
      .expect(200);
    expect(JSON.stringify(regions.body)).not.toContain('America/');
  });
  it('requires separate owner zone confirmation and prevents new public opening until confirmed', async () => {
    const publish = () =>
      requestApp(app)
        .post('/organizations/mine/cms/publish')
        .set(auth())
        .send({ expectedVersion: 0, idempotencyKey: randomUUID() });
    await publish().expect(409);
    await requestApp(app)
      .post(`${PATH}/zone`)
      .set(auth('ADMIN'))
      .send({ expectedRevision: 0, regionId: 'santo-domingo' })
      .expect(403);
    await requestApp(app)
      .put(`${PATH}/week`)
      .set(auth('ADMIN'))
      .send({ expectedRevision: 0, week })
      .expect(409);
    await confirm();
    expect(
      (
        await fixtures.cmsPage.findUniqueOrThrow({
          where: { organizationId: tenant.id },
        })
      ).isPublished,
    ).toBe(false);
    const cms = await requestApp(app)
      .get('/organizations/mine/cms')
      .set(auth())
      .expect(200);
    expect(JSON.stringify(cms.body)).toContain('operationalSchedule');
    await publish().expect(200);
    await requestApp(app)
      .get(`/public/${tenant.slug}/booking-data`)
      .expect(200);
  });
  it('rejects extra keys, missing days, midnight as opening, invalid region and overlarge pagination', async () => {
    await requestApp(app)
      .post(`${PATH}/zone`)
      .set(auth())
      .send({
        expectedRevision: 0,
        regionId: 'santo-domingo',
        organizationId: other.id,
      })
      .expect(400);
    await requestApp(app)
      .post(`${PATH}/zone`)
      .set(auth())
      .send({ expectedRevision: 0, regionId: 'America/New_York' })
      .expect(400);
    await requestApp(app)
      .put(`${PATH}/week`)
      .set(auth())
      .send({ expectedRevision: 0, week: week.slice(0, 6) })
      .expect(400);
    await requestApp(app)
      .put(`${PATH}/week`)
      .set(auth())
      .send({
        expectedRevision: 0,
        week: week.map((d) => ({
          ...d,
          windows: [{ startTime: '24:00', endTime: '24:00' }],
        })),
      })
      .expect(400);
    await requestApp(app)
      .get(`${PATH}/closures`)
      .set(auth())
      .query({ limit: 101 })
      .expect(400);
    await requestApp(app)
      .patch(PATH)
      .set(auth())
      .send({ businessHours: {} })
      .expect(404);
  });
  it('separates management notes, rejects role mutations and gives uniform foreign/not-found closure errors', async () => {
    await confirm();
    const created = await requestApp(app)
      .post(`${PATH}/closures`)
      .set(auth('ADMIN'))
      .send({
        expectedRevision: 2,
        startDate: '2099-01-05',
        endDate: '2099-01-05',
        startTime: '14:00',
        endTime: '15:00',
        reason: 'C1 private closure reason',
      })
      .expect(201);
    for (const role of ['BARBER', 'RECEPTIONIST']) {
      const list = await requestApp(app)
        .get(`${PATH}/closures`)
        .set(auth(role))
        .expect(200);
      expect(JSON.stringify(list.body)).not.toContain('private');
      await requestApp(app)
        .get(`${PATH}/closures`)
        .set(auth(role))
        .query({ includeCancelled: 'true' })
        .expect(403);
      await requestApp(app)
        .post(`${PATH}/closures`)
        .set(auth(role))
        .send({
          expectedRevision: 3,
          startDate: '2099-01-05',
          endDate: '2099-01-05',
          startTime: '10:00',
          endTime: '11:00',
        })
        .expect(403);
    }
    await fixtures.membership.create({
      data: {
        organizationId: other.id,
        userId: actors.OWNER.id,
        role: 'OWNER',
      },
    });
    const foreign = await requestApp(app)
      .post(
        `${PATH}/closures/${(created.body as { closureId: string }).closureId}/cancel`,
      )
      .set(auth('OWNER', other.id))
      .send({ expectedRevision: 0 })
      .expect(404);
    const missing = await requestApp(app)
      .post(`${PATH}/closures/${randomUUID()}/cancel`)
      .set(auth('OWNER', other.id))
      .send({ expectedRevision: 0 })
      .expect(404);
    expect(foreign.body).toEqual(missing.body);
    const back = await requestApp(app).get(PATH).set(auth()).expect(200);
    expect((back.body as { revision: number }).revision).toBe(3);
  });
  it('keeps stale revision, protected bookings and malformed timestamps recoverable without partial writes', async () => {
    await confirm();
    const professional = await fixtures.professional.create({
        data: {
          organizationId: tenant.id,
          name: 'C1 active',
          status: 'ACTIVE',
          isPublic: true,
        },
      }),
      client = await fixtures.client.create({
        data: { organizationId: tenant.id, name: 'C1 client' },
      }),
      service = await fixtures.service.create({
        data: {
          organizationId: tenant.id,
          name: 'C1 service',
          duration: 30,
          price: 100,
        },
      });
    const dto = {
      clientId: client.id,
      professionalId: professional.id,
      serviceId: service.id,
      startTime: '2099-01-05T14:00:00.000Z',
    };
    await requestApp(app)
      .post('/bookings')
      .set(auth())
      .send({ ...dto, startTime: '2099-01-05T14:00:00' })
      .expect(400);
    await requestApp(app).post('/bookings').set(auth()).send(dto).expect(201);
    const closed = week.map((d) => ({ ...d, windows: [] }));
    const impact = await requestApp(app)
      .post(`${PATH}/week/impact`)
      .set(auth())
      .query({ offset: 100, limit: 1 })
      .send({ expectedRevision: 2, week: closed })
      .expect(201);
    expect((impact.body as { conflictCount: number }).conflictCount).toBe(1);
    await requestApp(app)
      .put(`${PATH}/week`)
      .set(auth())
      .send({ expectedRevision: 2, week: closed })
      .expect(409);
    await requestApp(app)
      .put(`${PATH}/week`)
      .set(auth())
      .send({ expectedRevision: 1, week })
      .expect(409);
    expect(
      (
        await fixtures.businessSchedule.findUniqueOrThrow({
          where: { organizationId: tenant.id },
        })
      ).revision,
    ).toBe(2);
    expect(
      await fixtures.businessClosure.count({
        where: { organizationId: tenant.id },
      }),
    ).toBe(0);
  });
});
