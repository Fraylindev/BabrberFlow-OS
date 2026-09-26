import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ClerkSessionVerifierService } from '../src/auth/clerk/clerk-session-verifier.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { CmsService } from '../src/cms/cms.service';
import { PublicBookingService } from '../src/public-booking/public-booking.service';
import { createE2eApp, requestApp } from './create-e2e-app';

const PATH = '/organizations/mine/cms';
const command = (version: number) => ({
  expectedVersion: version,
  idempotencyKey: randomUUID(),
});
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected response object');
  return value as Record<string, unknown>;
}
describe('CMS C1 (PostgreSQL aislado, HTTP y guards reales)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const sessions = new Map<string, string>();
  let tenant: { id: string; slug: string };
  let other: { id: string; slug: string };
  let actors: Record<string, { id: string; token: string }>;
  const verifier = {
    verify: jest.fn((req: globalThis.Request) => {
      const token = req.headers
        .get('authorization')
        ?.replace(/^Bearer\s+/i, '');
      const identity = token ? sessions.get(token) : undefined;
      if (!identity) throw new UnauthorizedException('Sesión no válida');
      return Promise.resolve({
        clerkUserId: identity,
        sessionId: `session-${identity}`,
      });
    }),
  };
  beforeAll(async () => {
    app = await createE2eApp((builder) =>
      builder
        .overrideProvider(ClerkSessionVerifierService)
        .useValue(verifier)
        .overrideGuard(ThrottlerGuard)
        .useValue({ canActivate: () => true }),
    );
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await app.close();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.PUBLIC_BOOKING_CLOSED;
  });
  async function organization() {
    const suffix = randomUUID();
    return prisma.db.organization.create({
      data: {
        name: 'Nombre operativo',
        slug: suffix,
        email: `${suffix}@private.example.test`,
        phone: '+18095551234',
        aboutUs: 'Legacy privado',
        address: 'Legacy dirección',
        googleMapsUrl: 'https://google.com/maps/legacy',
        heroImageUrl: 'https://private.example.test/photo',
        socialLinks: { private: true },
        businessHours: { open: '09:00', close: '19:00' },
      },
    });
  }
  beforeEach(async () => {
    [tenant, other] = await Promise.all([organization(), organization()]);
    actors = {};
    for (const role of [
      UserRole.OWNER,
      UserRole.ADMIN,
      UserRole.BARBER,
      UserRole.RECEPTIONIST,
    ]) {
      const token = randomUUID();
      const user = await prisma.db.user.create({
        data: {
          name: role,
          email: `${token}@user.example.test`,
          clerkUserId: token,
          memberships: { create: { organizationId: tenant.id, role } },
        },
      });
      sessions.set(token, token);
      actors[role] = { id: user.id, token };
    }
  });
  function auth(role = 'OWNER', orgId = tenant.id) {
    return {
      Authorization: `Bearer ${actors[role].token}`,
      'x-organization-id': orgId,
    };
  }
  async function publish(version = 0) {
    return requestApp(app)
      .post(`${PATH}/publish`)
      .set(auth())
      .send(command(version))
      .expect(200);
  }
  async function page() {
    return prisma.db.cmsPage.findUniqueOrThrow({
      where: { organizationId: tenant.id },
    });
  }

  async function waitForOrganizationLock() {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const rows = await prisma.db.$queryRaw<
        Array<{ waiting: boolean }>
      >`SELECT EXISTS (
        SELECT 1 FROM pg_stat_activity WHERE datname = current_database()
        AND wait_event_type = 'Lock' AND query LIKE 'SELECT "id" FROM "Organization"%'
      ) AS waiting`;
      if (rows[0].waiting) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('No se observó la espera PostgreSQL esperada');
  }
  async function catalogue() {
    const [service, professional] = await Promise.all([
      prisma.db.service.create({
        data: {
          organizationId: tenant.id,
          name: 'Servicio real fixture',
          price: '250.00',
          duration: 30,
        },
      }),
      prisma.db.professional.create({
        data: {
          organizationId: tenant.id,
          name: 'Profesional público',
          phone: '8095559999',
          bio: 'Bio pública',
          status: 'ACTIVE',
          isPublic: true,
        },
      }),
    ]);
    return {
      serviceId: service.id,
      professionalId: professional.id,
      startTime: '2099-01-05T14:00:00.000Z',
      clientName: 'Cliente fixture',
      clientPhone: '+18095550000',
    };
  }
  it('alta nueva no publica ni copia columnas privadas y preview es privado', async () => {
    const result = await requestApp(app)
      .get(`${PATH}/preview`)
      .set(auth('ADMIN'))
      .expect(200);
    expect(result.headers['cache-control']).toBe('private, no-store');
    expect(result.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(result.body as unknown).toEqual({
      version: 0,
      draftRevision: 0,
      slug: tenant.slug,
      content: {
        publicName: 'Nombre operativo',
        phone: '+18095551234',
        description: null,
        address: null,
        googleMapsUrl: null,
      },
    });
    expect(await page()).toMatchObject({
      isPublished: false,
      publishedSnapshot: null,
    });
    await requestApp(app)
      .get(`/public/${tenant.slug}/booking-data`)
      .expect(404);
  });
  it.each(['BARBER', 'RECEPTIONIST'])(
    '%s no recibe CMS por ninguna ruta',
    async (role) => {
      await requestApp(app).get(PATH).set(auth(role)).expect(403);
      await requestApp(app).get(`${PATH}/preview`).set(auth(role)).expect(403);
      await requestApp(app)
        .patch(`${PATH}/draft`)
        .set(auth(role))
        .send({ ...command(0), publicName: 'Cambio' })
        .expect(403);
      for (const action of ['publish', 'unpublish'])
        await requestApp(app)
          .post(`${PATH}/${action}`)
          .set(auth(role))
          .send(command(0))
          .expect(403);
    },
  );
  it('ADMIN guarda y ve preview pero no publica ni retira', async () => {
    await requestApp(app)
      .patch(`${PATH}/draft`)
      .set(auth('ADMIN'))
      .send({
        ...command(0),
        publicName: ' Preparado por admin ',
        description: ' Texto ',
        phone: ' +1 (809) 555-0100 ',
      })
      .expect(200);
    expect(record((await page()).draft)).toMatchObject({
      publicName: 'Preparado por admin',
      description: 'Texto',
      phone: '+18095550100',
    });
    await requestApp(app).get(`${PATH}/preview`).set(auth('ADMIN')).expect(200);
    for (const action of ['publish', 'unpublish'])
      await requestApp(app)
        .post(`${PATH}/${action}`)
        .set(auth('ADMIN'))
        .send(command(1))
        .expect(403);
  });
  it.each(['OWNER', 'ADMIN', 'BARBER', 'RECEPTIONIST'])(
    'H2: claves exactas en mine y clerk/me para %s',
    async (role) => {
      for (const path of ['/organizations/mine', '/auth/clerk/me']) {
        const response = await requestApp(app)
          .get(path)
          .set(auth(role))
          .expect(200);
        expect(response.body as unknown).toEqual({
          id: tenant.id,
          name: 'Nombre operativo',
          slug: tenant.slug,
          timeZone: 'America/Santo_Domingo',
        });
      }
    },
  );
  it('tenant ajeno e inexistente son indistinguibles; body no elige tenant', async () => {
    for (const path of [PATH, `${PATH}/preview`]) {
      const foreign = await requestApp(app)
        .get(path)
        .set(auth('OWNER', other.id))
        .expect(401);
      const absent = await requestApp(app)
        .get(path)
        .set(auth('OWNER', randomUUID()))
        .expect(401);
      expect(foreign.body as unknown).toEqual(absent.body as unknown);
    }
    for (const action of ['publish', 'unpublish'])
      await requestApp(app)
        .post(`${PATH}/${action}`)
        .set(auth('OWNER', other.id))
        .send(command(0))
        .expect(401);
    await requestApp(app)
      .patch(`${PATH}/draft`)
      .set(auth('OWNER', other.id))
      .send({ ...command(0), publicName: 'IDOR' })
      .expect(401);
    await requestApp(app)
      .patch(`${PATH}/draft`)
      .set(auth())
      .send({ ...command(0), organizationId: other.id, publicName: 'IDOR' })
      .expect(400);
    expect(
      await prisma.db.cmsPage.findUnique({
        where: { organizationId: other.id },
      }),
    ).toMatchObject({ version: 0, isPublished: false });
  });
  it('guardar B conserva A público, publicar B cambia el snapshot exacto sin tocar operación', async () => {
    const before = await prisma.db.organization.findUnique({
      where: { id: tenant.id },
    });
    const data = await catalogue();
    await publish();
    const next = {
      publicName: 'Nombre B',
      description: 'Descripción nueva',
      phone: '+18095552222',
      address: 'Dirección nueva',
      googleMapsUrl: 'https://www.google.com/maps/place/Test',
    };
    await requestApp(app)
      .patch(`${PATH}/draft`)
      .set(auth())
      .send({ ...command(1), ...next })
      .expect(200);
    const publicA = await requestApp(app)
      .get(`/public/${tenant.slug}/booking-data`)
      .expect(200);
    expect(publicA.headers['cache-control']).toBe('no-store');
    expect(record(publicA.body).organization).toEqual({
      name: 'Nombre operativo',
      slug: tenant.slug,
      phone: '+18095551234',
      description: null,
      address: null,
      googleMapsUrl: null,
    });
    expect(JSON.stringify(publicA.body)).not.toMatch(
      /organizationId|private|8095559999|Nombre B|Descripción nueva/,
    );
    const preview = await requestApp(app)
      .get(`${PATH}/preview`)
      .set(auth())
      .expect(200);
    expect(record(preview.body).content).toEqual(next);
    await publish(2);
    expect((await page()).publishedSnapshot).toEqual(next);
    const publicB = await requestApp(app)
      .get(`/public/${tenant.slug}/booking-data`)
      .expect(200);
    expect(record(publicB.body).organization).toEqual({
      name: 'Nombre B',
      slug: tenant.slug,
      phone: '+18095552222',
      description: 'Descripción nueva',
      address: 'Dirección nueva',
      googleMapsUrl: 'https://www.google.com/maps/place/Test',
    });
    expect(JSON.stringify(publicB.body)).not.toContain(tenant.id);
    expect(JSON.stringify(publicB.body)).not.toMatch(
      /private\.example\.test|Legacy privado|Legacy dirección|private|8095559999/,
    );
    expect(
      await prisma.db.organization.findUnique({ where: { id: tenant.id } }),
    ).toEqual(before);
    expect(
      await prisma.db.professional.findUnique({
        where: { id: data.professionalId },
      }),
    ).toMatchObject({ phone: '8095559999', isPublic: true });
  });
  it('dos editores N producen un guardado y un conflicto', async () => {
    const results = await Promise.all(
      ['OWNER', 'ADMIN'].map((role) =>
        requestApp(app)
          .patch(`${PATH}/draft`)
          .set(auth(role))
          .send({ ...command(0), publicName: role }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await page()).version).toBe(1);
  });
  it('dos publicaciones idénticas son idempotentes y el recibo no revive una retirada', async () => {
    const dto = command(0);
    const results = await Promise.all(
      [0, 1].map(() =>
        requestApp(app).post(`${PATH}/publish`).set(auth()).send(dto),
      ),
    );
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(results[0].body as unknown).toEqual(results[1].body as unknown);
    expect(
      await prisma.db.auditLog.count({
        where: { organizationId: tenant.id, action: 'PUBLISH' },
      }),
    ).toBe(1);
    await requestApp(app)
      .post(`${PATH}/unpublish`)
      .set(auth())
      .send(command(1))
      .expect(200);
    await requestApp(app)
      .post(`${PATH}/publish`)
      .set(auth())
      .send(dto)
      .expect(200);
    expect(await page()).toMatchObject({ isPublished: false, version: 2 });
    await requestApp(app)
      .get(`/public/${tenant.slug}/booking-data`)
      .expect(404);
  });
  it('repetir publicación actual con otra clave no duplica evento; clave reutilizada con otro cuerpo da 409', async () => {
    const dto = command(0);
    await requestApp(app)
      .post(`${PATH}/publish`)
      .set(auth())
      .send(dto)
      .expect(200);
    await publish(1);
    expect((await page()).version).toBe(1);
    expect(
      await prisma.db.auditLog.count({
        where: { organizationId: tenant.id, action: 'PUBLISH' },
      }),
    ).toBe(1);
    await requestApp(app)
      .post(`${PATH}/unpublish`)
      .set(auth())
      .send({ ...dto, expectedVersion: 1 })
      .expect(409);
  });
  it('guardar es idempotente por actor/tenant; replay no pisa otro borrador', async () => {
    const dto = { ...command(0), publicName: 'Primero' };
    await requestApp(app)
      .patch(`${PATH}/draft`)
      .set(auth())
      .send(dto)
      .expect(200);
    await requestApp(app)
      .patch(`${PATH}/draft`)
      .set(auth())
      .send({ ...command(1), publicName: 'Segundo' })
      .expect(200);
    await requestApp(app)
      .patch(`${PATH}/draft`)
      .set(auth())
      .send(dto)
      .expect(200);
    expect(record((await page()).draft).publicName).toBe('Segundo');
    await requestApp(app)
      .patch(`${PATH}/draft`)
      .set(auth('ADMIN'))
      .send(dto)
      .expect(409);
  });
  it.each(['PUBLISH', 'UNPUBLISH'] as const)(
    'fallo de auditoría %s revierte datos, versión y recibo',
    async (operation) => {
      if (operation === 'UNPUBLISH') await publish();
      const before = await page();
      const dto = command(before.version);
      jest
        .spyOn(app.get(AuditService), 'logTransactional')
        .mockRejectedValueOnce(new Error('synthetic private constraint'));
      const response = await requestApp(app)
        .post(`${PATH}/${operation.toLowerCase()}`)
        .set(auth())
        .send(dto)
        .expect(503);
      expect(JSON.stringify(response.body)).not.toContain('constraint');
      expect(await page()).toEqual(before);
      expect(
        await prisma.db.cmsOperation.count({
          where: { organizationId: tenant.id, key: dto.idempotencyKey },
        }),
      ).toBe(0);
      await requestApp(app)
        .post(`${PATH}/${operation.toLowerCase()}`)
        .set(auth())
        .send(dto)
        .expect(200);
    },
  );
  it.each(['publish', 'unpublish'])(
    'fallo de invalidación en %s revierte también AuditLog',
    async (action) => {
      if (action === 'unpublish') await publish();
      const before = await page();
      const count = await prisma.db.auditLog.count({
        where: { organizationId: tenant.id },
      });
      jest
        .spyOn(app.get<Cache>(CACHE_MANAGER), 'clear')
        .mockRejectedValueOnce(new Error('cache fail'));
      await requestApp(app)
        .post(`${PATH}/${action}`)
        .set(auth())
        .send(command(before.version))
        .expect(503);
      expect(await page()).toEqual(before);
      expect(
        await prisma.db.auditLog.count({
          where: { organizationId: tenant.id },
        }),
      ).toBe(count);
    },
  );
  it('fallo de auditoría de borrador no impide persistencia ni reintento idempotente', async () => {
    jest
      .spyOn(app.get(AuditService), 'log')
      .mockRejectedValueOnce(new Error('log fail'));
    const dto = { ...command(0), publicName: 'Guardado' };
    await requestApp(app)
      .patch(`${PATH}/draft`)
      .set(auth())
      .send(dto)
      .expect(200);
    await requestApp(app)
      .patch(`${PATH}/draft`)
      .set(auth())
      .send(dto)
      .expect(200);
    expect(await page()).toMatchObject({ version: 1, isPublished: false });
  });
  it('roles y Membership se revalidan con la misma sesión y recibo', async () => {
    const dto = command(0);
    await requestApp(app)
      .post(`${PATH}/publish`)
      .set(auth())
      .send(dto)
      .expect(200);
    await prisma.db.membership.update({
      where: {
        userId_organizationId: {
          userId: actors.OWNER.id,
          organizationId: tenant.id,
        },
      },
      data: { role: UserRole.BARBER },
    });
    await requestApp(app)
      .post(`${PATH}/publish`)
      .set(auth())
      .send(dto)
      .expect(403);
    await requestApp(app).get(`${PATH}/preview`).set(auth()).expect(403);
    await prisma.db.membership.delete({
      where: {
        userId_organizationId: {
          userId: actors.OWNER.id,
          organizationId: tenant.id,
        },
      },
    });
    await requestApp(app).get(PATH).set(auth()).expect(401);
  });
  it('revalida cambio de rol mientras la publicación espera el bloqueo', async () => {
    let locked!: () => void;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const holder = prisma.db.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Organization" WHERE "id" = ${tenant.id} FOR UPDATE`,
      );
      locked();
      await gate;
      await tx.membership.update({
        where: {
          userId_organizationId: {
            userId: actors.OWNER.id,
            organizationId: tenant.id,
          },
        },
        data: { role: UserRole.BARBER },
      });
    });
    await ready;
    const pending = app
      .get(CmsService)
      .mutate(tenant.id, actors.OWNER.id, 'PUBLISH', command(0));
    const assertion = expect(pending).rejects.toThrow('permiso');
    try {
      await waitForOrganizationLock();
    } finally {
      release();
    }
    await holder;
    await assertion;
    expect((await page()).isPublished).toBe(false);
  });
  it('H1: crea con slug, reprograma internamente tras retiro y mantiene reservas existentes', async () => {
    const body = await catalogue();
    await publish();
    const availability = await requestApp(app)
      .get(`/public/${tenant.slug}/availability`)
      .query({ date: '2099-01-05', serviceId: body.serviceId })
      .expect(200);
    expect(record(availability.body).slots).toEqual(
      expect.arrayContaining([
        {
          time: '10:00',
          professionalId: body.professionalId,
          startTime: '2099-01-05T14:00:00.000Z',
        },
      ]),
    );
    const created = await requestApp(app)
      .post(`/public/${tenant.slug}/bookings`)
      .send(body)
      .expect(201);
    const booking = record(record(created.body).booking);
    expect(booking).not.toHaveProperty('organizationId');
    await requestApp(app)
      .post(`${PATH}/unpublish`)
      .set(auth())
      .send(command(1))
      .expect(200);
    const snapshot = (await page()).publishedSnapshot;
    for (const path of [
      'booking-data',
      `availability?date=2099-01-05&serviceId=${body.serviceId}`,
    ])
      await requestApp(app).get(`/public/${tenant.slug}/${path}`).expect(404);
    await requestApp(app)
      .post(`/public/${tenant.slug}/bookings`)
      .send({ ...body, startTime: '2099-01-05T15:00:00Z' })
      .expect(404);
    await requestApp(app)
      .patch(`/bookings/${String(booking.id)}`)
      .set(auth())
      .send({ startTime: '2099-01-05T16:00:00Z' })
      .expect(200);
    expect(
      await prisma.db.booking.count({ where: { organizationId: tenant.id } }),
    ).toBe(1);
    expect((await page()).publishedSnapshot).toEqual(snapshot);
    expect(
      await prisma.db.organization.findUnique({ where: { id: tenant.id } }),
    ).toMatchObject({ isActive: true, deletedAt: null });
  });
  it('rechaza fechas públicas malformadas o imposibles con 400', async () => {
    const body = await catalogue();
    await publish();
    for (const date of [
      '2026-02-30',
      '2026-13-01',
      '0000-01-01',
      '92026-06-14',
      '14/mm/92026',
    ]) {
      await requestApp(app)
        .get(`/public/${tenant.slug}/availability`)
        .query({ date, serviceId: body.serviceId })
        .expect(400);
    }
  });
  it.each(['inactive', 'deleted', 'unpublished', 'absent'])(
    '%s devuelve presentación pública neutra en todas las rutas',
    async (state) => {
      const body = await catalogue();
      await publish();
      await requestApp(app)
        .get(`/public/${tenant.slug}/booking-data`)
        .expect(200);
      if (state === 'inactive')
        await prisma.db.organization.update({
          where: { id: tenant.id },
          data: { isActive: false },
        });
      if (state === 'deleted')
        await prisma.db.organization.update({
          where: { id: tenant.id },
          data: { deletedAt: new Date() },
        });
      if (state === 'unpublished')
        await requestApp(app)
          .post(`${PATH}/unpublish`)
          .set(auth())
          .send(command(1))
          .expect(200);
      const slug = state === 'absent' ? randomUUID() : tenant.slug;
      const read = await requestApp(app)
        .get(`/public/${slug}/booking-data`)
        .expect(404);
      const absent = await requestApp(app)
        .get(`/public/${randomUUID()}/booking-data`)
        .expect(404);
      expect(read.body as unknown).toEqual(absent.body as unknown);
      await requestApp(app)
        .get(`/public/${slug}/availability`)
        .query({ date: '2099-01-05', serviceId: body.serviceId })
        .expect(404);
      await requestApp(app)
        .post(`/public/${slug}/bookings`)
        .send(body)
        .expect(404);
      if (state === 'inactive' || state === 'deleted')
        await requestApp(app)
          .post(`${PATH}/publish`)
          .set(auth())
          .send(command(1))
          .expect(409);
    },
  );
  it('cierre de rollback no reexpone legacy y conserva operación/CMS', async () => {
    await publish();
    process.env.PUBLIC_BOOKING_CLOSED = 'true';
    await requestApp(app)
      .get(`/public/${tenant.slug}/booking-data`)
      .expect(404);
    await requestApp(app).get(PATH).set(auth()).expect(200);
    expect((await page()).isPublished).toBe(true);
  });
  it('PATCH vacío y campos operativos quedan rechazados', async () => {
    for (const patch of [
      {},
      { publicName: null },
      { businessHours: {} },
      { timeZone: 'UTC' },
      { slug: 'new-slug' },
      { email: 'public@example.test' },
    ])
      await requestApp(app)
        .patch(`${PATH}/draft`)
        .set(auth())
        .send({ ...command(0), ...patch })
        .expect(400);
    expect((await page()).version).toBe(0);
  });

  it.each([null, { malformed: true }, { open: '10:00', close: '12:00' }])(
    'horario %j conserva su semántica tras guardar/publicar CMS',
    async (hours) => {
      const body = await catalogue();
      await prisma.db.organization.update({
        where: { id: tenant.id },
        data: { businessHours: hours ?? Prisma.DbNull },
      });
      await publish();
      const url = `/public/${tenant.slug}/availability`;
      const query = { date: '2099-01-05', serviceId: body.serviceId };
      const before = await requestApp(app).get(url).query(query).expect(200);
      const slots = record(before.body).slots as Array<{ time: string }>;
      expect(slots[0].time).toBe(hours && 'open' in hours ? '10:00' : '09:00');
      expect(slots.at(-1)?.time).toBe(
        hours && 'open' in hours ? '11:30' : '18:30',
      );
      await requestApp(app)
        .patch(`${PATH}/draft`)
        .set(auth())
        .send({ ...command(1), publicName: 'Edición sin agenda' })
        .expect(200);
      await publish(2);
      const after = await requestApp(app).get(url).query(query).expect(200);
      expect(after.body as unknown).toEqual(before.body as unknown);
      expect(
        await prisma.db.organization.findUnique({ where: { id: tenant.id } }),
      ).toMatchObject({
        businessHours: hours,
        timeZone: 'America/Santo_Domingo',
      });
    },
  );

  it('misma identidad A→B→A no cruza borradores ni claves idempotentes', async () => {
    await prisma.db.membership.create({
      data: {
        userId: actors.OWNER.id,
        organizationId: other.id,
        role: UserRole.ADMIN,
      },
    });
    const dto = { ...command(0), publicName: 'Borrador A' };
    await requestApp(app)
      .patch(`${PATH}/draft`)
      .set(auth())
      .send(dto)
      .expect(200);
    await requestApp(app)
      .patch(`${PATH}/draft`)
      .set(auth('OWNER', other.id))
      .send({ ...dto, publicName: 'Borrador B' })
      .expect(200);
    for (const [id, name] of [
      [tenant.id, 'Borrador A'],
      [other.id, 'Borrador B'],
      [tenant.id, 'Borrador A'],
    ]) {
      const response = await requestApp(app)
        .get(`${PATH}/preview`)
        .set(auth('OWNER', id))
        .expect(200);
      expect(record(record(response.body).content).publicName).toBe(name);
    }
    await requestApp(app).get(`${PATH}/preview`).expect(401);
    sessions.delete(actors.OWNER.token);
    await requestApp(app).get(`${PATH}/preview`).set(auth()).expect(401);
  });

  it('slug no autoriza servicio/profesional de otro tenant ni deja un cliente parcial', async () => {
    const local = await catalogue();
    const foreignService = await prisma.db.service.create({
      data: {
        organizationId: other.id,
        name: 'Foreign',
        price: '250',
        duration: 30,
      },
    });
    const foreignProfessional = await prisma.db.professional.create({
      data: {
        organizationId: other.id,
        name: 'Foreign',
        status: 'ACTIVE',
        isPublic: true,
      },
    });
    await publish();
    for (const body of [
      { ...local, serviceId: foreignService.id },
      { ...local, professionalId: foreignProfessional.id },
    ]) {
      const response = await requestApp(app)
        .post(`/public/${tenant.slug}/bookings`)
        .send(body);
      expect([400, 404]).toContain(response.status);
      expect(JSON.stringify(response.body)).not.toContain(other.id);
    }
    expect(
      await prisma.db.client.count({ where: { organizationId: tenant.id } }),
    ).toBe(0);
    expect(
      await prisma.db.booking.count({ where: { organizationId: tenant.id } }),
    ).toBe(0);
  });

  it('retirada concurrente gana al POST ya abierto; PostgreSQL no crea cliente ni reserva', async () => {
    const body = await catalogue();
    await publish();
    const audit = app.get<AuditService>(AuditService);
    const actualAudit = new AuditService(prisma);
    let reached!: () => void;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    jest
      .spyOn(audit, 'logTransactional')
      .mockImplementationOnce(async (entry, tx) => {
        await actualAudit.logTransactional(entry, tx);
        reached();
        await gate;
      });
    const withdrawing = app
      .get(CmsService)
      .mutate(tenant.id, actors.OWNER.id, 'UNPUBLISH', command(1));
    await ready;
    const booking = app
      .get(PublicBookingService)
      .createBooking(tenant.slug, body);
    const rejected = expect(booking).rejects.toThrow(
      'Información no disponible',
    );
    try {
      await waitForOrganizationLock();
    } finally {
      release();
    }
    await withdrawing;
    await rejected;
    expect(
      await prisma.db.booking.count({ where: { organizationId: tenant.id } }),
    ).toBe(0);
    expect(
      await prisma.db.client.count({ where: { organizationId: tenant.id } }),
    ).toBe(0);
  });

  it('publicar frente a guardar desde N nunca publica una revisión distinta en silencio', async () => {
    const results = await Promise.all([
      requestApp(app).post(`${PATH}/publish`).set(auth()).send(command(0)),
      requestApp(app)
        .patch(`${PATH}/draft`)
        .set(auth('ADMIN'))
        .send({ ...command(0), publicName: 'Competidor' }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const current = await page();
    expect(current.version).toBe(1);
    if (current.isPublished)
      expect(record(current.publishedSnapshot).publicName).toBe(
        'Nombre operativo',
      );
    else expect(record(current.draft).publicName).toBe('Competidor');
  });

  it('un fallo real de INSERT AuditLog en PostgreSQL revierte publicación', async () => {
    await prisma.db.$executeRawUnsafe(
      `CREATE FUNCTION cms_test_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."entity" = 'CmsPage' THEN RAISE EXCEPTION 'Synthetic audit outage'; END IF; RETURN NEW; END; $$`,
    );
    await prisma.db.$executeRawUnsafe(
      `CREATE TRIGGER cms_test_reject_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION cms_test_reject_audit()`,
    );
    try {
      const before = await page();
      await requestApp(app)
        .post(`${PATH}/publish`)
        .set(auth())
        .send(command(0))
        .expect(503);
      expect(await page()).toEqual(before);
      expect(
        await prisma.db.cmsOperation.count({
          where: { organizationId: tenant.id },
        }),
      ).toBe(0);
      await requestApp(app)
        .patch(`${PATH}/draft`)
        .set(auth())
        .send({ ...command(0), publicName: 'Guardado pese al log' })
        .expect(200);
      expect((await page()).version).toBe(1);
    } finally {
      await prisma.db.$executeRawUnsafe(
        `DROP TRIGGER cms_test_reject_audit ON "AuditLog"`,
      );
      await prisma.db.$executeRawUnsafe(
        `DROP FUNCTION cms_test_reject_audit()`,
      );
    }
  });
});
