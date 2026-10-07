import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { ClerkSessionVerifierService } from '../src/auth/clerk/clerk-session-verifier.service';
import { MediaCloudinary } from '../src/media/media-cloudinary';
import { MediaPurgeWorker } from '../src/media/media-purge.worker';
import { PrismaService } from '../src/prisma/prisma.service';
import { PublicBookingService } from '../src/public-booking/public-booking.service';
import { ProfessionalAvailabilityService } from '../src/professionals/professional-availability.service';
import { createE2eApp, requestApp } from './create-e2e-app';

type RangeResult = {
  from: string;
  to: string;
  serviceId: string;
  availableDates: string[];
};
const from = '2099-01-01';
const to = '2099-01-31';
const asDate = (value: string) => new Date(`${value}T00:00:00Z`);

describe('M1 C1 — HTTP, PostgreSQL aislado, coherencia y abuso', () => {
  let app: INestApplication;
  let second: INestApplication;
  let db: PrismaClient;
  let queryCount = 0;
  let beforePublicClientCreate: (() => Promise<void>) | null = null;
  const sessions = new Set<string>();
  const cloud = {
    fetchVariant: jest.fn(() =>
      Promise.resolve(Buffer.from('controlled-webp')),
    ),
  };
  const verifier = {
    verify: jest.fn((req: globalThis.Request) => {
      const token = req.headers
        .get('authorization')
        ?.replace(/^Bearer\s+/i, '');
      if (!token || !sessions.has(token))
        throw new UnauthorizedException('Sesión no válida');
      return Promise.resolve({
        clerkUserId: token,
        sessionId: `controlled-${token}`,
      });
    }),
  };
  let tenant: { id: string; slug: string };
  let other: { id: string; slug: string };
  let serviceId: string;
  let professionalId: string;
  let otherServiceId: string;
  let otherProfessionalId: string;
  let previousMediaSigningSecret: string | undefined;

  async function newApp(measured = false) {
    return createE2eApp((b) => {
      b.overrideProvider(ClerkSessionVerifierService)
        .useValue(verifier)
        .overrideProvider(MediaCloudinary)
        .useValue(cloud)
        .overrideProvider(MediaPurgeWorker)
        .useValue({ onModuleInit() {}, onModuleDestroy() {} });
      if (measured)
        b.overrideProvider(PrismaService).useValue({
          db: db.$extends({
            query: {
              client: {
                async create({ args, query }) {
                  if (beforePublicClientCreate) {
                    const hook = beforePublicClientCreate;
                    beforePublicClientCreate = null;
                    await hook();
                  }
                  return query(args);
                },
              },
            },
          }),
          onModuleInit: () => db.$connect(),
          onModuleDestroy: () => db.$disconnect(),
        });
      return b;
    });
  }
  beforeAll(async () => {
    // Firma sintética de esta suite aislada; MediaCloudinary permanece sustituido.
    previousMediaSigningSecret = process.env.CLOUDINARY_API_SECRET;
    process.env.CLOUDINARY_API_SECRET = 'synthetic-media-signing-fixture';
    const measured = new PrismaClient({
      log: [{ level: 'query', emit: 'event' }],
    });
    measured.$on('query', () => queryCount++); // No persistir SQL/params ni PII.
    db = measured;
    app = await newApp(true);
    second = await newApp();
  });
  afterAll(async () => {
    try {
      if (second) await second.close();
      if (app) await app.close();
      await db.$disconnect();
    } finally {
      if (previousMediaSigningSecret === undefined)
        delete process.env.CLOUDINARY_API_SECRET;
      else process.env.CLOUDINARY_API_SECRET = previousMediaSigningSecret;
    }
  });
  async function organization(
    zone = 'America/Santo_Domingo',
    open = 540,
    close = 600,
  ) {
    const id = randomUUID();
    const org = await db.organization.create({
      data: {
        id,
        slug: id,
        name: 'Negocio sintético M1',
        email: `${id}@test.invalid`,
        timeZone: zone,
        businessSchedule: {
          create: {
            state: 'CONFIRMED',
            zoneConfirmed: true,
            days: {
              create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
                dayOfWeek,
                windows: { create: [{ startMinute: open, endMinute: close }] },
              })),
            },
          },
        },
      },
    });
    await db.cmsPage.update({
      where: { organizationId: org.id },
      data: {
        isPublished: true,
        publishedSnapshot: { publicName: 'Publicado sintético' },
        publishedRevision: 0,
      },
    });
    const service = await db.service.create({
      data: {
        organizationId: org.id,
        name: 'Servicio M1',
        duration: 30,
        price: 100,
      },
    });
    const professional = await db.professional.create({
      data: {
        organizationId: org.id,
        name: 'Profesional M1',
        isPublic: true,
        status: 'ACTIVE',
        phone: 'synthetic-private-phone',
      },
    });
    return { org, service, professional };
  }
  beforeEach(async () => {
    beforePublicClientCreate = null;
    // Solo la base desechable validada por globalSetup; no fixtures compartidas reales.
    await db.securityRateBucket.deleteMany();
    const a = await organization();
    const b = await organization();
    tenant = a.org;
    other = b.org;
    serviceId = a.service.id;
    professionalId = a.professional.id;
    otherServiceId = b.service.id;
    otherProfessionalId = b.professional.id;
    cloud.fetchVariant.mockClear();
  });
  function days(
    target = app,
    overrides: Record<string, string | undefined> = {},
    slug = tenant.slug,
  ) {
    return requestApp(target)
      .get(`/public/${slug}/availability-days`)
      .query({ serviceId, from, to, ...overrides });
  }
  async function daily(
    date: string,
    id = professionalId,
    slug = tenant.slug,
    service = serviceId,
  ) {
    const result = await requestApp(app)
      .get(`/public/${slug}/availability`)
      .query({
        serviceId: service,
        date,
        ...(id ? { professionalId: id } : {}),
      })
      .expect(200);
    return result.body as {
      slots: { time: string; professionalId: string; startTime: string }[];
    };
  }
  async function closure(
    startDate: string,
    endDate = startDate,
    startMinute = 0,
    endMinute = 1440,
  ) {
    return db.businessClosure.create({
      data: {
        organizationId: tenant.id,
        startDate: asDate(startDate),
        endDate: asDate(endDate),
        startMinute,
        endMinute,
        reason: 'synthetic-private-reason',
      },
    });
  }

  it('rango inclusivo 31 días, proyección mínima y no-store; selección específica o cualquiera', async () => {
    const response = await days().expect(200);
    const body = response.body as RangeResult;
    expect(response.headers['cache-control']).toBe('no-store');
    expect(Object.keys(body).sort()).toEqual([
      'availableDates',
      'from',
      'serviceId',
      'to',
    ]);
    expect(body.availableDates).toHaveLength(31);
    expect(body.availableDates[0]).toBe(from);
    expect(body.availableDates[30]).toBe(to);
    expect((await days(app, { professionalId }).expect(200)).body).toEqual(
      body,
    );
    expect(JSON.stringify(body)).not.toContain(tenant.id);
    expect(JSON.stringify(body)).not.toContain('private');
    const slot = (await daily(from)).slots[0];
    expect(slot).toEqual({
      time: '09:00',
      professionalId,
      startTime: '2099-01-01T13:00:00.000Z',
    });
  });

  it('DTO cierra queries y fechas imposibles; límite 31 es civil, no segundos', async () => {
    for (const override of [
      { from: '2099-02-29' },
      { from: '2099-01-01T00:00:00Z' },
      { to: '2099-02-01' },
      { from: '2099-02-01' },
      { serviceId: 'invalid' },
      { professionalId: 'invalid' },
      { organizationId: other.id },
      { timeZone: 'UTC' },
      { from: '2000-01-01' },
      { from: '9999-12-31', to: '9999-12-31' },
    ])
      await days(app, override).expect(400);
    await requestApp(app)
      .get(`/public/${tenant.slug}/availability-days`)
      .query({ serviceId, from })
      .expect(400);
  });

  it('IDs ajenos e inexistentes indistinguibles; headers no sustituyen negocio y B conserva sus huecos', async () => {
    for (const [field, foreign] of [
      ['serviceId', otherServiceId],
      ['professionalId', otherProfessionalId],
    ]) {
      const a = await days(app, { [field]: foreign }).expect(400);
      const b = await days(app, { [field]: randomUUID() }).expect(400);
      expect(a.body).toEqual(b.body);
    }
    await closure(from, to);
    expect(
      ((await days().expect(200)).body as RangeResult).availableDates,
    ).toEqual([]);
    const b = await days(app, { serviceId: otherServiceId }, other.slug)
      .set('x-organization-id', tenant.id)
      .set('Authorization', 'Bearer untrusted')
      .expect(200);
    expect((b.body as RangeResult).availableDates).toHaveLength(31);
  });

  it('cierres parciales/completos, turno individual, bloques ACTIVE/CANCELLED y duración completa', async () => {
    await closure('2099-01-02');
    await closure('2099-01-03', '2099-01-03', 540, 570);
    await db.professionalWeeklySchedule.createMany({
      data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        organizationId: tenant.id,
        professionalId,
        dayOfWeek,
        startMinute: 570,
        endMinute: 600,
      })),
    });
    await db.professionalAvailabilityBlock.createMany({
      data: [
        {
          organizationId: tenant.id,
          professionalId,
          startTime: new Date('2099-01-04T13:30Z'),
          endTime: new Date('2099-01-04T14:00Z'),
          status: 'ACTIVE',
          note: 'synthetic-private-note',
        },
        {
          organizationId: tenant.id,
          professionalId,
          startTime: new Date('2099-01-05T13:30Z'),
          endTime: new Date('2099-01-05T14:00Z'),
          status: 'CANCELLED',
        },
      ],
    });
    const result = (
      await days(app, { to: '2099-01-05', professionalId }).expect(200)
    ).body as RangeResult;
    expect(result.availableDates).toEqual([from, '2099-01-03', '2099-01-05']);
    for (let n = 1; n <= 5; n++) {
      const date = `2099-01-0${n}`;
      expect(result.availableDates.includes(date)).toBe(
        (await daily(date)).slots.length > 0,
      );
    }
    await db.service.update({
      where: { id: serviceId },
      data: { duration: 60 },
    });
    expect(
      ((await days(app, { to: '2099-01-05' }).expect(200)).body as RangeResult)
        .availableDates,
    ).toEqual([]);
  });

  it('ocupación de PENDING/CONFIRMED/COMPLETED/NO_SHOW resta, CANCELLED no; cualquiera conserva otro candidato', async () => {
    const client = await db.client.create({
      data: { organizationId: tenant.id, name: 'Cliente sintético' },
    });
    const statuses = [
      'PENDING',
      'CONFIRMED',
      'COMPLETED',
      'NO_SHOW',
      'CANCELLED',
    ] as const;
    for (let i = 0; i < statuses.length; i++) {
      await db.booking.create({
        data: {
          organizationId: tenant.id,
          clientId: client.id,
          serviceId,
          professionalId,
          status: statuses[i],
          startTime: new Date(`2099-01-0${i + 1}T13:00Z`),
          endTime: new Date(`2099-01-0${i + 1}T14:00Z`),
        },
      });
    }
    expect(
      (
        (await days(app, { to: '2099-01-05', professionalId }).expect(200))
          .body as RangeResult
      ).availableDates,
    ).toEqual(['2099-01-05']);
    await db.professional.create({
      data: {
        organizationId: tenant.id,
        name: 'Segundo candidato',
        status: 'ACTIVE',
        isPublic: true,
      },
    });
    expect(
      ((await days(app, { to: '2099-01-05' }).expect(200)).body as RangeResult)
        .availableDates,
    ).toHaveLength(5);
  });

  it('zona real/DST: rangos de 23/25 horas y media hora coinciden con el motor diario', async () => {
    for (const [zone, date, hours] of [
      ['America/New_York', '2030-03-10', 23],
      ['America/New_York', '2030-11-03', 25],
      ['Australia/Lord_Howe', '2030-10-06', 23.5],
      ['Australia/Lord_Howe', '2030-04-07', 24.5],
    ] as const) {
      const x = await organization(zone, 60, 240);
      const range = app
        .get(ProfessionalAvailabilityService)
        .getUtcRangeForLocalDate(date, zone);
      expect((range.end.getTime() - range.start.getTime()) / 3600000).toBe(
        hours,
      );
      const response = await days(
        app,
        { serviceId: x.service.id, from: date, to: date },
        x.org.slug,
      ).expect(200);
      const slots = await daily(
        date,
        x.professional.id,
        x.org.slug,
        x.service.id,
      );
      expect((response.body as RangeResult).availableDates.includes(date)).toBe(
        slots.slots.length > 0,
      );
      if (zone === 'America/New_York')
        expect(slots.slots.map((s) => s.time)).not.toContain(
          date === '2030-03-10' ? '02:00' : '01:00',
        );
    }
  });

  it('legacy fiel mantiene slots; corrupción confirmada da 503 y retiro/ausencia 404 iguales', async () => {
    await db.businessSchedule.update({
      where: { organizationId: tenant.id },
      data: { state: 'LEGACY_UNCONFIRMED', legacyPublicAllowed: true },
    });
    expect(
      ((await days(app, { to: from }).expect(200)).body as RangeResult)
        .availableDates,
    ).toEqual([from]);
    expect((await daily(from)).slots[0].time).toBe('09:00');
    await db.businessSchedule.update({
      where: { organizationId: tenant.id },
      data: { state: 'CONFIRMED' },
    });
    await db.businessScheduleWindow.deleteMany({
      where: { organizationId: tenant.id },
    });
    await expect(
      db.businessScheduleDay.deleteMany({
        where: { organizationId: tenant.id, dayOfWeek: 0 },
      }),
    ).rejects.toThrow('Incomplete confirmed business week');
    // La constraint evita corrupción del agregado. Zona inválida simula datos
    // externos corruptos sin desactivar constraints ni controles.
    await db.organization.update({
      where: { id: tenant.id },
      data: { timeZone: 'Invalid/synthetic' },
    });
    await days().expect(503);
    await db.organization.update({
      where: { id: tenant.id },
      data: { timeZone: 'America/Santo_Domingo' },
    });
    await db.cmsPage.update({
      where: { organizationId: tenant.id },
      data: { isPublished: false },
    });
    const withdrawn = await days().expect(404);
    const missing = await days(app, {}, randomUUID()).expect(404);
    expect(withdrawn.body).toEqual(missing.body);
  });

  it('snapshot real: cierre concurrente no produce un mes mezclado; consulta posterior lo ve', async () => {
    const available = app.get(ProfessionalAvailabilityService);
    const implementation: ProfessionalAvailabilityService['getPublicContext'] =
      available.getPublicContext.bind(
        available,
      ) as ProfessionalAvailabilityService['getPublicContext'];
    const spy = jest
      .spyOn(available, 'getPublicContext')
      .mockImplementation(async (...args) => {
        await closure(from, to);
        return implementation(...args);
      });
    try {
      expect(
        ((await days().expect(200)).body as RangeResult).availableDates,
      ).toHaveLength(31);
    } finally {
      spy.mockRestore();
    }
    expect(
      ((await days().expect(200)).body as RangeResult).availableDates,
    ).toEqual([]);
  });

  it('lectura pública igual para cinco roles; configuración privada conserva permisos autoritativos', async () => {
    const baseline = (await days().expect(200)).body as RangeResult;
    await requestApp(app).get('/organizations/mine/schedule').expect(401);
    for (const role of Object.values(UserRole)) {
      const token = randomUUID();
      sessions.add(token);
      await db.user.create({
        data: {
          name: role,
          email: `${token}@test.invalid`,
          clerkUserId: token,
          memberships: { create: { organizationId: tenant.id, role } },
        },
      });
      const headers = {
        Authorization: `Bearer ${token}`,
        'x-organization-id': tenant.id,
      };
      expect((await days().set(headers).expect(200)).body).toEqual(baseline);
      await requestApp(app)
        .get('/organizations/mine/schedule')
        .set(headers)
        .expect(role === 'CUSTOMER' ? 403 : 200);
      await requestApp(app)
        .post('/organizations/mine/schedule/zone')
        .set(headers)
        .send({ expectedRevision: 0, regionId: 'santo-domingo' })
        .expect(role === 'OWNER' ? 201 : 403);
    }
  });

  it('fotos existentes: solo publicadas/elegibles, metadata pública, revocación y tenant en entrega', async () => {
    const base = {
      organizationId: tenant.id,
      sha256: 'a'.repeat(64),
      bytes: 100,
      width: 640,
      height: 640,
      uploadedByUserId: randomUUID(),
      stagingExpiresAt: new Date('2099-02-01'),
      altText: 'synthetic-private-draft',
      publishedAltText: 'Foto publicada',
      cloudVersion: 1,
      status: 'PUBLISHED' as const,
      moderationStatus: 'APPROVED' as const,
      publishedRevision: 1,
      publishedAt: new Date(),
    };
    const servicePhoto = await db.mediaAsset.create({
      data: {
        ...base,
        purpose: 'SERVICE',
        targetId: serviceId,
        cloudPublicId: `controlled/${randomUUID()}`,
      },
    });
    const avatar = await db.mediaAsset.create({
      data: {
        ...base,
        purpose: 'PROFESSIONAL_AVATAR',
        targetId: professionalId,
        cloudPublicId: `controlled/${randomUUID()}`,
      },
    });
    await db.mediaAsset.create({
      data: {
        ...base,
        purpose: 'SERVICE',
        targetId: serviceId,
        status: 'APPROVED',
      },
    });
    const response = await requestApp(app)
      .get(`/public/${tenant.slug}/media`)
      .expect(200);
    const body = response.body as {
      services: { serviceId: string; image: { id: string; url: string } }[];
      professionals: {
        professionalId: string;
        avatar: { id: string; url: string };
      }[];
    };
    expect(body.services.map((s) => s.image.id)).toEqual([servicePhoto.id]);
    expect(body.professionals.map((p) => p.avatar.id)).toEqual([avatar.id]);
    expect(JSON.stringify(body)).not.toMatch(
      /synthetic-private|cloudPublicId|cloudVersion|uploadedByUserId|moderationStatus/,
    );
    const url = body.services[0].image.url;
    await requestApp(app).get(url).expect(200);
    expect(cloud.fetchVariant).toHaveBeenCalledTimes(1);
    await requestApp(app).get(url.replace(tenant.slug, other.slug)).expect(404);
    await db.service.update({
      where: { id: serviceId },
      data: { isActive: false },
    });
    await requestApp(app).get(url).expect(404);
    await db.professional.update({
      where: { id: professionalId },
      data: { isPublic: false },
    });
    const after = await requestApp(app)
      .get(`/public/${tenant.slug}/media`)
      .expect(200);
    expect((after.body as { services: unknown[] }).services).toEqual([]);
    expect((after.body as { professionals: unknown[] }).professionals).toEqual(
      [],
    );
    await requestApp(app).get(body.professionals[0].avatar.url).expect(404);
  });

  it('M1_BUDGET: mide 31 días con catálogo/bloques/duración variables, sin límite fijado por intuición', async () => {
    const business = app.get(PublicBookingService);
    for (const [count, duration, blocked] of [
      [1, 30, false],
      [10, 60, false],
      [40, 15, true],
      [40, 360, true],
    ] as const) {
      const x = await organization('America/Santo_Domingo', 0, 1440);
      await db.service.update({
        where: { id: x.service.id },
        data: { duration },
      });
      const ids = [
        x.professional.id,
        ...Array.from({ length: count - 1 }, () => randomUUID()),
      ];
      await db.professional.createMany({
        data: ids.slice(1).map((id) => ({
          id,
          organizationId: x.org.id,
          name: id,
          status: 'ACTIVE' as const,
          isPublic: true,
        })),
      });
      if (blocked)
        await db.professionalAvailabilityBlock.createMany({
          data: ids.flatMap((id) =>
            Array.from({ length: 31 }, (_, i) => ({
              organizationId: x.org.id,
              professionalId: id,
              startTime: new Date(Date.UTC(2099, 0, i + 1, 4)),
              endTime: new Date(Date.UTC(2099, 0, i + 2, 4)),
              note: 'synthetic-only',
            })),
          ),
        });
      const samples: number[] = [];
      let queries = 0;
      const cpu = process.cpuUsage();
      for (let i = 0; i < 3; i++) {
        queryCount = 0;
        const start = performance.now();
        const result = await business.getAvailabilityDays(x.org.slug, {
          serviceId: x.service.id,
          from,
          to,
        });
        samples.push(performance.now() - start);
        queries = queryCount;
        expect(result.availableDates.length).toBe(blocked ? 0 : 31);
        expect(queries).toBeLessThanOrEqual(24); // Incluye BEGIN, SET TRANSACTION, nested policy selects y COMMIT.
      }
      console.log(
        'M1_BUDGET',
        JSON.stringify({
          professionals: count,
          duration,
          blocks: blocked ? count * 31 : 0,
          samplesMs: samples.map((n) => Math.round(n)),
          queries,
          cpuMs: Math.round(
            (process.cpuUsage(cpu).user + process.cpuUsage(cpu).system) / 1000,
          ),
        }),
      );
    }
  }, 120000);

  it('30/min compartido: inválidas, dos instancias, cambio de slug, spoof IP y recreación no reinician presupuesto', async () => {
    for (let i = 0; i < 30; i++) {
      await days(
        i % 2 ? app : second,
        { from: 'invalid' },
        i % 2 ? tenant.slug : other.slug,
      )
        .set('X-Forwarded-For', `198.51.100.${i + 1}`)
        .set('Forwarded', `for=198.51.100.${i + 1}`)
        .expect(400);
    }
    await second.close();
    second = await newApp();
    const limited = await days(second).expect(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(limited.headers['retry-after'])).toBeLessThanOrEqual(60);
    expect(JSON.stringify(limited.body)).not.toMatch(
      /198\.51|tenant|client|Prisma/,
    );
    const buckets = await db.securityRateBucket.findMany();
    expect(buckets).toHaveLength(1);
    expect(buckets[0].count).toBe(31);
    expect(buckets[0].key).toMatch(/^[a-f0-9]{64}$/);
    // Simular expiración únicamente en el contador desechable, sin esperar al reloj.
    await db.securityRateBucket.updateMany({
      data: { expiresAt: new Date(0), blockedUntil: null },
    });
    await days(second, { to: from }).expect(200);
    expect((await db.securityRateBucket.findMany())[0].count).toBe(1);
  });

  it('35 solicitudes concurrentes a dos instancias: exactamente 30 admitidas y cinco 429', async () => {
    const results = await Promise.all(
      Array.from({ length: 35 }, (_, i) =>
        days(i % 2 ? app : second, { serviceId: 'invalid' }),
      ),
    );
    expect(results.filter((r) => r.status === 400)).toHaveLength(30);
    expect(results.filter((r) => r.status === 429)).toHaveLength(5);
    expect((await db.securityRateBucket.findMany())[0].count).toBe(35);
  });

  it('contador compartido caído: 503 seguro antes de calcular, nunca disponibilidad vacía', async () => {
    const spy = jest
      .spyOn(db, '$queryRaw')
      .mockRejectedValueOnce(new Error('synthetic-private-database-detail'));
    try {
      const response = await days().expect(503);
      expect(JSON.stringify(response.body)).not.toMatch(
        /synthetic-private|availableDates|Prisma/,
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('D11: error genérico idéntico con/sin coincidencia; mantiene rechazo atómico y éxito PENDING separado', async () => {
    await db.client.createMany({
      data: [
        {
          organizationId: tenant.id,
          name: 'Sintético A',
          phone: '+18095550001',
          email: 'm1-a@test.invalid',
        },
        {
          organizationId: tenant.id,
          name: 'Sintético B',
          phone: '+18095550002',
          email: 'm1-b@test.invalid',
        },
      ],
    });
    const slot = (await daily(from)).slots[0];
    const dto = {
      serviceId,
      professionalId,
      startTime: slot.startTime,
      clientName: 'Sintético C',
      clientPhone: '+18095550001',
      clientEmail: 'm1-b@test.invalid',
    };
    const collision = await requestApp(app)
      .post(`/public/${tenant.slug}/bookings`)
      .send(dto)
      .expect(400);
    const invalid = await requestApp(app)
      .post(`/public/${tenant.slug}/bookings`)
      .send({ ...dto, clientPhone: '123', clientEmail: 'm1-new@test.invalid' })
      .expect(400);
    expect(collision.body).toEqual(invalid.body);
    expect(collision.body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message:
        'No pudimos registrar la reserva con esos datos. Revísalos o contacta al negocio.',
    });
    expect(JSON.stringify(collision.body)).not.toMatch(
      /m1-b|180955|clientes diferentes|Ya existe|P2002|email|phone/,
    );
    expect(
      await db.booking.count({ where: { organizationId: tenant.id } }),
    ).toBe(0);
    expect(
      await db.client.count({ where: { organizationId: tenant.id } }),
    ).toBe(2);
    const created = await requestApp(app)
      .post(`/public/${tenant.slug}/bookings`)
      .send({
        ...dto,
        clientPhone: '+18095550003',
        clientEmail: 'm1-c@test.invalid',
      })
      .expect(201);
    expect(created.status).not.toBe(collision.status);
    expect(created.body).not.toEqual(collision.body);
    expect(
      (created.body as { booking: { status: string } }).booking.status,
    ).toBe('PENDING');
    expect(
      await db.booking.count({ where: { organizationId: tenant.id } }),
    ).toBe(1);
    // Éxito y rechazo son resultados distintos por la opción expresa del propietario.
  });

  it('D11: violación real de email único recibe el mismo 400 y revierte Client/Booking', async () => {
    const existing = await db.client.create({
      data: {
        organizationId: tenant.id,
        name: 'Sintético carrera',
        email: 'm1-before@test.invalid',
        phone: '+18095550004',
      },
    });
    const slot = (await daily(from)).slots[0];
    const dto = {
      serviceId,
      professionalId,
      startTime: slot.startTime,
      clientName: 'Sintético nuevo',
      clientPhone: '+18095550005',
      clientEmail: 'm1-race@test.invalid',
    };
    // Introducir la colisión después de las búsquedas: UPDATE desde otra conexión
    // no cambia la FK de tenant ni toma el lock Organization del alta pública.
    beforePublicClientCreate = async () => {
      await db.client.update({
        where: { id: existing.id },
        data: { email: dto.clientEmail },
      });
    };
    try {
      const collision = await requestApp(app)
        .post(`/public/${tenant.slug}/bookings`)
        .send(dto)
        .expect(400);
      const invalid = await requestApp(app)
        .post(`/public/${tenant.slug}/bookings`)
        .send({
          ...dto,
          clientPhone: '123',
          clientEmail: 'm1-absent@test.invalid',
        })
        .expect(400);
      expect(collision.body).toEqual(invalid.body);
      expect(
        await db.client.count({ where: { organizationId: tenant.id } }),
      ).toBe(1);
      expect(
        await db.booking.count({ where: { organizationId: tenant.id } }),
      ).toBe(0);
      expect(
        await db.auditLog.count({ where: { organizationId: tenant.id } }),
      ).toBe(0);
    } finally {
      beforePublicClientCreate = null;
    }
  });

  it('D11: contacto nuevo y reutilizable conservan 201/PENDING y proyección sin indicador de existencia', async () => {
    const dto = {
      serviceId,
      professionalId,
      clientName: 'Sintético retorno',
      clientPhone: '+18095550006',
      clientEmail: 'm1-return@test.invalid',
    };
    const firstSlot = (await daily(from)).slots[0];
    const first = await requestApp(app)
      .post(`/public/${tenant.slug}/bookings`)
      .send({ ...dto, startTime: firstSlot.startTime })
      .expect(201);
    const secondSlot = (await daily('2099-01-02')).slots[0];
    const returned = await requestApp(app)
      .post(`/public/${tenant.slug}/bookings`)
      .send({ ...dto, startTime: secondSlot.startTime })
      .expect(201);
    const shape = (body: unknown) => {
      const result = body as {
        booking: {
          id: string;
          startTime: string;
          endTime: string;
          status: string;
        };
      };
      expect(JSON.stringify(body)).not.toMatch(
        /m1-return|18095550006|clientId|organizationId|clientCreated|clientExists/,
      );
      return {
        keys: Object.keys(result).sort(),
        bookingKeys: Object.keys(result.booking).sort(),
        status: result.booking.status,
      };
    };
    expect(shape(first.body)).toEqual(shape(returned.body));
    expect(
      await db.client.count({ where: { organizationId: tenant.id } }),
    ).toBe(1);
    expect(
      await db.booking.count({ where: { organizationId: tenant.id } }),
    ).toBe(2);
  });
});
