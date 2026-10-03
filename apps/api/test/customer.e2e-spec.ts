import { fork, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { BookingStatus, PrismaClient, UserRole } from '@prisma/client';
import request from 'supertest';
import { EMAIL_NOTICE_VERSION } from '../src/notifications/notification-policy';
import { PostgresThrottlerStorage } from '../src/security/postgres-throttler.storage';
import { PrismaService } from '../src/prisma/prisma.service';

interface Summary {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  canBookAgain: boolean;
}
interface Page {
  items: Summary[];
  asOf: string;
  nextCursor: string | null;
  business: { slug: string; name: string };
}
interface Detail extends Summary {
  business: { phone: string | null; address: string | null };
  actions: { canBookAgain: boolean };
}
interface Profile {
  name: string;
  phone: string | null;
  email: string | null;
  canEditContact: boolean;
}
interface Tenant {
  id: string;
  slug: string;
  serviceId: string;
  professionalId: string;
}

describe('M2 C1 — HTTP y PostgreSQL, dos procesos aislados', () => {
  const db = new PrismaClient();
  const children: ChildProcess[] = [];
  const actor = `m2_test_${randomUUID()}`;
  const stranger = `m2_test_${randomUUID()}`;
  let userId: string;
  let strangerId: string;
  let clientId: string;
  let otherClientId: string;
  let southClientId: string;
  let north: Tenant;
  let south: Tenant;
  let first: string;
  let second: string;
  let original: string;

  async function startProcess(): Promise<string> {
    const child = fork(resolve(__dirname, 'customer-process.ts'), [], {
      cwd: resolve(__dirname, '..'),
      execArgv: ['-r', 'ts-node/register'],
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
      env: { ...process.env, TS_NODE_TRANSPILE_ONLY: 'true' },
    });
    children.push(child);
    // Nunca reenviar stdout ni tokens/cuerpos de peticiones a la evidencia.
    child.stderr?.resume();
    return new Promise((done, reject) => {
      const timer = setTimeout(
        () => reject(new Error('El proceso HTTP no arrancó')),
        30000,
      );
      child.once('error', reject);
      child.once('exit', (code) => {
        if (code !== 0) reject(new Error('Falló el proceso HTTP'));
      });
      child.once('message', (message: { port: number; pid: number }) => {
        clearTimeout(timer);
        expect(message.pid).not.toBe(process.pid);
        done(`http://127.0.0.1:${message.port}`);
      });
    });
  }

  async function tenant(): Promise<Tenant> {
    const id = randomUUID();
    await db.organization.create({
      data: {
        id,
        name: 'Negocio M2 sintético',
        slug: id,
        email: `${id}@test.invalid`,
        businessSchedule: {
          create: {
            state: 'CONFIRMED',
            zoneConfirmed: true,
            days: {
              create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
                dayOfWeek,
                windows: { create: { startMinute: 540, endMinute: 1080 } },
              })),
            },
          },
        },
      },
    });
    await db.cmsPage.update({
      where: { organizationId: id },
      data: {
        isPublished: true,
        publishedRevision: 0,
        publishedSnapshot: {
          publicName: 'Publicado M2',
          description: null,
          phone: '+18095550100',
          address: 'Dirección sintética',
          googleMapsUrl: null,
        },
      },
    });
    const service = await db.service.create({
      data: {
        organizationId: id,
        name: 'Servicio M2',
        duration: 30,
        price: 100,
      },
    });
    const professional = await db.professional.create({
      data: {
        organizationId: id,
        name: 'Profesional M2',
        status: 'ACTIVE',
        isPublic: true,
      },
    });
    return {
      id,
      slug: id,
      serviceId: service.id,
      professionalId: professional.id,
    };
  }

  const get = (path: string, token = actor, server = first) =>
    request(server).get(path).auth(token, { type: 'bearer' });
  const create = (
    time: string,
    key: string = randomUUID(),
    server = first,
    extra: Record<string, unknown> = {},
  ) =>
    request(server)
      .post(`/customer/${north.slug}/bookings`)
      .auth(actor, { type: 'bearer' })
      .set('Idempotency-Key', key)
      .send({
        serviceId: north.serviceId,
        professionalId: north.professionalId,
        startTime: time,
        ...extra,
      });
  const profile = (
    body: Record<string, unknown>,
    key: string = randomUUID(),
    server = first,
  ) =>
    request(server)
      .patch(`/customer/${north.slug}/profile`)
      .auth(actor, { type: 'bearer' })
      .set('Idempotency-Key', key)
      .send(body);
  const slot = (day: number, hour = 13) =>
    `2099-02-${String(day).padStart(2, '0')}T${hour}:00:00Z`;
  const emailFor = (token: string) => `${token.slice(8)}@test.invalid`;
  const claim = (
    tenant: Tenant,
    bookingId: string,
    token = actor,
    server = first,
  ) =>
    request(server)
      .post('/auth/clerk/customer/claims')
      .auth(token, { type: 'bearer' })
      .send({ bookingId, organizationSlug: tenant.slug });

  async function guestFixture() {
    const business = await tenant();
    const token = `m2_test_${randomUUID()}`;
    const response = await request(first)
      .post(`/public/${business.slug}/bookings`)
      .send({
        serviceId: business.serviceId,
        professionalId: business.professionalId,
        startTime: slot(1),
        clientName: 'Invitado D4',
        clientEmail: emailFor(token),
        clientPhone: '+18095550771',
      })
      .expect(201);
    const id = (response.body as { booking: Summary }).booking.id;
    const booking = await db.booking.findUniqueOrThrow({ where: { id } });
    return { business, token, bookingId: id, clientId: booking.clientId };
  }

  beforeAll(async () => {
    north = await tenant();
    south = await tenant();
    userId = (
      await db.user.create({
        data: {
          name: 'Cliente A',
          email: emailFor(actor),
          clerkUserId: actor,
        },
      })
    ).id;
    strangerId = (
      await db.user.create({
        data: {
          name: 'Cliente B',
          email: emailFor(stranger),
          clerkUserId: stranger,
        },
      })
    ).id;
    clientId = (
      await db.client.create({
        data: {
          organizationId: north.id,
          userId,
          name: 'Cliente A',
          phone: '+18095550101',
          email: emailFor(actor),
          notes: 'NO EXPONER',
        },
      })
    ).id;
    otherClientId = (
      await db.client.create({
        data: {
          organizationId: north.id,
          userId: strangerId,
          name: 'Cliente B',
          phone: '+18095550102',
          customerAccessBlocked: false,
        },
      })
    ).id;
    southClientId = (
      await db.client.create({
        data: {
          organizationId: south.id,
          userId,
          name: 'Cliente A Sur',
          phone: '+18095550101',
          email: emailFor(actor),
        },
      })
    ).id;
    original = (
      await db.booking.create({
        data: {
          organizationId: north.id,
          clientId,
          serviceId: north.serviceId,
          professionalId: north.professionalId,
          startTime: new Date(slot(1)),
          endTime: new Date(slot(1, 14)),
        },
      })
    ).id;
    first = await startProcess();
    second = await startProcess();
    expect(children[0].pid).not.toBe(children[1].pid);
    await claim(north, original).expect(200);
    const southBooking = await db.booking.create({
      data: {
        organizationId: south.id,
        clientId: southClientId,
        serviceId: south.serviceId,
        professionalId: south.professionalId,
        startTime: new Date(slot(1)),
        endTime: new Date(slot(1, 14)),
      },
    });
    await claim(south, southBooking.id).expect(200);
  }, 90000);
  beforeEach(async () => {
    await db.securityRateBucket.deleteMany();
  });
  afterAll(async () => {
    await Promise.all(
      children.map(
        (child) =>
          new Promise<void>((done) => {
            if (child.exitCode !== null) {
              done();
              return;
            }
            child.once('exit', () => done());
            child.send('close');
          }),
      ),
    );
    await db.$disconnect();
  });

  it('sin User devuelve vínculos vacíos y no provisiona identidad ni Membership', async () => {
    const before = await db.user.count();
    const memberships = await db.membership.count();
    const result = await get(
      '/customer/businesses',
      `m2_test_${randomUUID()}`,
    ).expect(200);
    expect(result.body).toEqual({ businesses: [] });
    expect(await db.user.count()).toBe(before);
    expect(await db.membership.count()).toBe(memberships);
  });

  it('rechaza JWT legacy, sesión ausente/revocada, no-store incluso en 401', async () => {
    for (const token of ['legacy-jwt-synthetic', 'revoked-synthetic']) {
      const result = await get('/customer/businesses', token).expect(401);
      expect(result.headers['cache-control']).toBe('private, no-store');
    }
    await request(first).get('/customer/businesses').expect(401);
    const unavailable = await get(
      '/customer/businesses',
      'synthetic-clerk-unavailable',
    ).expect(503);
    expect(unavailable.headers['cache-control']).toBe('private, no-store');
  });

  it('lista solo negocios vinculados y no expone IDs/contactos internos', async () => {
    const result = await get('/customer/businesses').expect(200);
    const body = result.body as {
      businesses: { slug: string; name: string; canBook: boolean }[];
    };
    expect(body.businesses.map((b) => b.slug).sort()).toEqual(
      [north.slug, south.slug].sort(),
    );
    expect(JSON.stringify(body)).not.toMatch(
      /organizationId|userId|clientId|notes|email|Membership/,
    );
    const other = await get('/customer/businesses', stranger).expect(200);
    expect((other.body as typeof body).businesses.map((b) => b.slug)).toEqual([
      north.slug,
    ]);
  });

  it('otro cliente, otro negocio, sin vínculo e inexistente devuelven el mismo 404', async () => {
    const own = await get(
      `/customer/${north.slug}/bookings/${original}`,
    ).expect(200);
    expect(JSON.stringify(own.body)).not.toMatch(
      /NO EXPONER|organizationId|clientId|userId|Invoice|Payment|email|avatar/,
    );
    const a = await get(
      `/customer/${north.slug}/bookings/${original}`,
      stranger,
    ).expect(404);
    const b = await get(
      `/customer/${north.slug}/bookings/${randomUUID()}`,
    ).expect(404);
    const c = await get(`/customer/${south.slug}/bookings/${original}`).expect(
      404,
    );
    const d = await get(`/customer/${randomUUID()}/profile`).expect(404);
    expect(a.body).toEqual(b.body);
    expect(b.body).toEqual(c.body);
    expect(c.body).toEqual(d.body);
  });

  it.each([
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.BARBER,
    UserRole.CUSTOMER,
  ])(
    'rol %s no concede lectura de otro cliente ni acceso sin vínculo',
    async (role) => {
      const id = randomUUID();
      const token = `m2_test_${id}`;
      await db.user.create({
        data: {
          id,
          name: 'Personal sintético',
          email: `${id}@test.invalid`,
          clerkUserId: token,
        },
      });
      await db.membership.create({
        data: { organizationId: north.id, userId: id, role },
      });
      await get(`/customer/${north.slug}/bookings/${original}`, token).expect(
        404,
      );
      await db.client.create({
        data: {
          organizationId: north.id,
          userId: id,
          name: 'Personal como cliente',
          customerAccessBlocked: false,
        },
      });
      await get(`/customer/${north.slug}/profile`, token).expect(200);
      await get(`/customer/${north.slug}/bookings/${original}`, token).expect(
        404,
      );
    },
  );

  it('sesión solo cliente no obtiene agenda, clientes internos, finanzas ni política etapa 2', async () => {
    for (const path of [
      '/bookings',
      '/clients',
      '/invoices',
      '/professionals',
    ]) {
      const denied = await get(path).set('x-organization-id', north.id);
      expect([401, 403]).toContain(denied.status);
    }
    await get(`/customer/${north.slug}/booking-policy`).expect(404);
    await request(first)
      .post(`/customer/${north.slug}/bookings/${original}/cancel`)
      .auth(actor, { type: 'bearer' })
      .send({})
      .expect(404);
  });

  it('D4 cuarentena de mezcla confirmada persiste y requiere revisión explícita', async () => {
    await db.client.update({
      where: { id: clientId },
      data: { customerHistoryAmbiguous: true },
    });
    await get(`/customer/${north.slug}/profile`).expect(404);
    await get(`/customer/${north.slug}/bookings/${original}`).expect(404);
    const result = await get('/customer/businesses').expect(200);
    expect(
      (result.body as { businesses: { slug: string }[] }).businesses.map(
        (b) => b.slug,
      ),
    ).toEqual([south.slug]);
    await db.client.update({
      where: { id: clientId },
      data: { customerHistoryAmbiguous: false },
    });
    await claim(north, original).expect(200);
    await get(`/customer/${north.slug}/bookings/${original}`).expect(200);
    const defaultClient = await db.client.create({
      data: { organizationId: north.id, name: 'Histórico ambiguo' },
    });
    expect(defaultClient.customerAccessBlocked).toBe(true);
  });

  it('D4 invitado→claim válido habilita lista/detalle sin operador ni Membership', async () => {
    const f = await guestFixture();
    await get(`/customer/${f.business.slug}/bookings`, f.token).expect(404);
    expect(
      (await db.client.findUniqueOrThrow({ where: { id: f.clientId } })).userId,
    ).toBeNull();
    const memberships = await db.membership.count();
    await claim(f.business, f.bookingId, f.token).expect(201);
    const page = (
      await get(`/customer/${f.business.slug}/bookings`, f.token).expect(200)
    ).body as Page;
    expect(page.items.map((b) => b.id)).toEqual([f.bookingId]);
    await get(
      `/customer/${f.business.slug}/bookings/${f.bookingId}`,
      f.token,
    ).expect(200);
    const foreign = await get(
      `/customer/${f.business.slug}/bookings/${f.bookingId}`,
      stranger,
    ).expect(404);
    const absent = await get(
      `/customer/${f.business.slug}/bookings/${randomUUID()}`,
      stranger,
    ).expect(404);
    expect(foreign.body).toEqual(absent.body);
    expect(await db.membership.count()).toBe(memberships);
    expect(
      (await db.client.findUniqueOrThrow({ where: { id: f.clientId } }))
        .customerAccessBlocked,
    ).toBe(false);
  });

  it('D4 conflicto objetivo de teléfono compartido con reservas mantiene cuarentena tras claim', async () => {
    const f = await guestFixture();
    const peer = await db.client.create({
      data: {
        organizationId: f.business.id,
        name: 'Otra ficha histórica',
        email: `${randomUUID()}@test.invalid`,
        phone: '+18095550771',
      },
    });
    await db.booking.create({
      data: {
        organizationId: f.business.id,
        clientId: peer.id,
        serviceId: f.business.serviceId,
        professionalId: f.business.professionalId,
        startTime: new Date(slot(2)),
        endTime: new Date(slot(2, 14)),
      },
    });
    await claim(f.business, f.bookingId, f.token).expect(201);
    expect(
      await db.client.findUniqueOrThrow({ where: { id: f.clientId } }),
    ).toMatchObject({
      customerAccessBlocked: true,
      customerHistoryAmbiguous: true,
    });
    await get(`/customer/${f.business.slug}/bookings`, f.token).expect(404);
    // Quitar el síntoma no resuelve por sí solo la mezcla histórica.
    await db.client.update({ where: { id: peer.id }, data: { phone: null } });
    await claim(f.business, f.bookingId, f.token).expect(200);
    await db.client.update({
      where: { id: f.clientId },
      data: { customerAccessBlocked: false },
    });
    await get(
      `/customer/${f.business.slug}/bookings/${f.bookingId}`,
      f.token,
    ).expect(404);
  });

  it('D4 reasignación bloquea ambas sesiones; exige un nuevo claim válido y coherente', async () => {
    const f = await guestFixture();
    await claim(f.business, f.bookingId, f.token).expect(201);
    const newActor = `m2_test_${randomUUID()}`;
    const user = await db.user.create({
      data: {
        name: 'Nueva identidad sintética',
        clerkUserId: newActor,
        email: emailFor(newActor),
      },
    });
    await db.client.update({
      where: { id: f.clientId },
      data: { userId: user.id },
    });
    await get(`/customer/${f.business.slug}/bookings`, f.token).expect(404);
    await get(`/customer/${f.business.slug}/bookings`, newActor).expect(404);
    await claim(f.business, f.bookingId, newActor).expect(409);
    expect(
      (await db.client.findUniqueOrThrow({ where: { id: f.clientId } }))
        .customerAccessBlocked,
    ).toBe(true);
    await db.client.update({
      where: { id: f.clientId },
      data: { email: emailFor(newActor) },
    });
    await get(`/customer/${f.business.slug}/bookings`, newActor).expect(404);
    await claim(f.business, f.bookingId, newActor).expect(200);
    await get(
      `/customer/${f.business.slug}/bookings/${f.bookingId}`,
      newActor,
    ).expect(200);
    await get(
      `/customer/${f.business.slug}/bookings/${f.bookingId}`,
      f.token,
    ).expect(404);
  });

  it('D4 dos procesos reclaman a la vez: 201/200 y lectura habilitada en ambos', async () => {
    const f = await guestFixture();
    const results = await Promise.all([
      claim(f.business, f.bookingId, f.token, first),
      claim(f.business, f.bookingId, f.token, second),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 201]);
    for (const server of [first, second])
      await get(
        `/customer/${f.business.slug}/bookings/${f.bookingId}`,
        f.token,
        server,
      ).expect(200);
    expect(
      await db.auditLog.count({
        where: { entityId: f.clientId, action: 'LINK' },
      }),
    ).toBe(1);
  });

  it('D4 fallo de auditoría revierte enlace y habilitación; reintento conserva una reserva', async () => {
    const f = await guestFixture();
    await db.$executeRawUnsafe(
      "CREATE FUNCTION m2_d4_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic claim audit failure'; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER m2_d4_fail_audit BEFORE INSERT ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION m2_d4_fail_audit()',
    );
    try {
      await claim(f.business, f.bookingId, f.token).expect(500);
      expect(
        await db.client.findUniqueOrThrow({ where: { id: f.clientId } }),
      ).toMatchObject({ userId: null, customerAccessBlocked: true });
      expect(
        await db.user.findUnique({ where: { clerkUserId: f.token } }),
      ).toBeNull();
      await get(`/customer/${f.business.slug}/bookings`, f.token).expect(404);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER m2_d4_fail_audit ON "AuditLog"');
      await db.$executeRawUnsafe('DROP FUNCTION m2_d4_fail_audit()');
    }
    await claim(f.business, f.bookingId, f.token).expect(201);
    await get(
      `/customer/${f.business.slug}/bookings/${f.bookingId}`,
      f.token,
    ).expect(200);
    expect(
      await db.booking.count({ where: { organizationId: f.business.id } }),
    ).toBe(1);
  });

  it('perfil solo propio: normaliza, no propaga y no modifica correo/avisos', async () => {
    const before = await db.client.findUniqueOrThrow({
      where: { id: clientId },
    });
    const result = await profile({
      name: '  Nombre nuevo  ',
      phone: '+1 (809) 555-0103',
    }).expect(200);
    expect(result.body as Profile).toEqual({
      name: 'Nombre nuevo',
      phone: '+18095550103',
      email: before.email,
      canEditContact: true,
    });
    expect(
      (await db.client.findUniqueOrThrow({ where: { id: clientId } }))
        .emailRevision,
    ).toBe(before.emailRevision);
    const southClient = await db.client.findFirstOrThrow({
      where: { organizationId: south.id, userId },
    });
    expect(southClient.name).toBe('Cliente A Sur');
    expect(southClient.phone).toBe('+18095550101');
    const audit = await db.auditLog.findFirstOrThrow({
      where: { entityId: clientId, action: 'UPDATE' },
    });
    expect(JSON.stringify(audit)).not.toMatch(
      /Nombre nuevo|18095550103|m2-contact/,
    );
    await profile({ phone: null }).expect(200);
  });

  it.each([
    { name: null },
    { name: ' ' },
    { name: '' },
    { name: 'a'.repeat(121) },
    { phone: '123' },
    { phone: 'a'.repeat(31) },
    {},
    { email: 'other@test.invalid' },
    { notes: 'x' },
    { userId: randomUUID() },
    { clientId: randomUUID() },
    { organizationId: randomUUID() },
    { isActive: true },
    { role: 'OWNER' },
    { customerAccessBlocked: false },
    { customerHistoryAmbiguous: false },
  ])('perfil rechaza campos inválidos/forjados %j', async (body) => {
    await profile(body).expect(400);
  });

  it('perfil idempotente entre dos procesos: un recibo y una auditoría; comandos diferentes/vencidos no escriben', async () => {
    const key = randomUUID();
    const before = await db.auditLog.count({
      where: { entityId: clientId, action: 'UPDATE' },
    });
    const results = await Promise.all([
      profile({ name: 'Perfil único' }, key, first),
      profile({ name: '  Perfil único  ' }, key, second),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(results[0].body).toEqual(results[1].body);
    expect(
      await db.auditLog.count({
        where: { entityId: clientId, action: 'UPDATE' },
      }),
    ).toBe(before + 1);
    const receipt = await db.customerOperation.findFirstOrThrow({
      where: {
        organizationId: north.id,
        clientId,
        operation: 'UPDATE_PROFILE',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(receipt.bookingId).toBeNull();
    expect(JSON.stringify(receipt)).not.toMatch(
      /Perfil único|1809555|m2-contact/,
    );
    await profile({ name: 'Otro comando' }, key).expect(409);
    await db.customerOperation.update({
      where: { id: receipt.id },
      data: {
        createdAt: new Date(Date.now() - 86500000),
        expiresAt: new Date(Date.now() - 100000),
      },
    });
    await profile({ name: 'Perfil único' }, key).expect(409);
    expect(
      (await db.client.findUniqueOrThrow({ where: { id: clientId } })).name,
    ).toBe('Perfil único');
  });

  it('perfil exige clave; fallo de recibo revierte contacto y auditoría', async () => {
    await request(first)
      .patch(`/customer/${north.slug}/profile`)
      .auth(actor, { type: 'bearer' })
      .send({ name: 'Sin clave' })
      .expect(400);
    const before = await db.client.findUniqueOrThrow({
      where: { id: clientId },
    });
    const audits = await db.auditLog.count({ where: { entityId: clientId } });
    await db.$executeRawUnsafe(
      `CREATE FUNCTION m2_fail_profile() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic profile failure'; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER m2_fail_profile BEFORE INSERT ON "CustomerOperation" FOR EACH ROW EXECUTE FUNCTION m2_fail_profile()`,
    );
    try {
      await profile({ name: 'No persistir' }).expect(503);
      expect(
        (await db.client.findUniqueOrThrow({ where: { id: clientId } })).name,
      ).toBe(before.name);
      expect(await db.auditLog.count({ where: { entityId: clientId } })).toBe(
        audits,
      );
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER m2_fail_profile ON "CustomerOperation"',
      );
      await db.$executeRawUnsafe('DROP FUNCTION m2_fail_profile()');
    }
  });

  it('colisión de contacto es neutra y no sobrescribe otro cliente', async () => {
    const result = await profile({ phone: '+18095550102' }).expect(409);
    expect(JSON.stringify(result.body)).not.toMatch(
      /Prisma|P2002|constraint|Cliente B|18095550102/,
    );
    expect(
      (await db.client.findUniqueOrThrow({ where: { id: otherClientId } }))
        .phone,
    ).toBe('+18095550102');
  });

  it('partición/orden/páginas, asOf fijo; todos los estados y fechas', async () => {
    for (const [index, status] of [
      'PENDING',
      'CONFIRMED',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW',
    ].entries()) {
      await db.booking.create({
        data: {
          organizationId: north.id,
          clientId,
          serviceId: north.serviceId,
          professionalId: north.professionalId,
          status: status as BookingStatus,
          startTime: new Date(slot(10 + index)),
          endTime: new Date(slot(10 + index, 14)),
        },
      });
    }
    await db.booking.create({
      data: {
        organizationId: north.id,
        clientId,
        serviceId: north.serviceId,
        professionalId: north.professionalId,
        startTime: new Date('2000-01-01T13:00:00Z'),
        endTime: new Date('2000-01-01T14:00:00Z'),
      },
    });
    const upcoming = (
      await get(
        `/customer/${north.slug}/bookings?view=upcoming&limit=1`,
      ).expect(200)
    ).body as Page;
    expect(upcoming.items[0].id).toBe(original);
    expect(upcoming.nextCursor).toBeTruthy();
    const next = (
      await get(
        `/customer/${north.slug}/bookings?view=upcoming&limit=1&cursor=${upcoming.nextCursor}`,
      ).expect(200)
    ).body as Page;
    expect(next.asOf).toBe(upcoming.asOf);
    expect(next.items[0].id).not.toBe(original);
    const history = (
      await get(
        `/customer/${north.slug}/bookings?view=history&limit=50`,
      ).expect(200)
    ).body as Page;
    expect(history.items.map((b) => b.status)).toEqual([
      'NO_SHOW',
      'CANCELLED',
      'COMPLETED',
      'PENDING',
    ]);
    const allUpcoming = (
      await get(`/customer/${north.slug}/bookings`).expect(200)
    ).body as Page;
    expect(allUpcoming.items.length).toBe(3);
    expect(
      allUpcoming.items.every((b) => !history.items.some((h) => h.id === b.id)),
    ).toBe(true);
  });

  it('cursor manipulado/otro actor/tenant/vista/instante elegido y límites', async () => {
    const page = (
      await get(`/customer/${north.slug}/bookings?limit=1`).expect(200)
    ).body as Page;
    await get(
      `/customer/${north.slug}/bookings?cursor=${page.nextCursor}`,
      stranger,
    ).expect(404);
    await get(
      `/customer/${south.slug}/bookings?cursor=${page.nextCursor}`,
    ).expect(404);
    await get(
      `/customer/${north.slug}/bookings?view=history&cursor=${page.nextCursor}`,
    ).expect(404);
    await get(
      `/customer/${north.slug}/bookings?cursor=${page.nextCursor!.slice(0, -3)}xxx`,
    ).expect(400);
    for (const query of [
      'limit=0',
      'limit=51',
      'view=all',
      'cursor=x',
      'asOf=2099-01-01',
      `clientId=${clientId}`,
      'limit=1.5',
    ])
      await get(`/customer/${north.slug}/bookings?${query}`).expect(400);
  });

  it('reserva en curso sigue en Próximas; desempate por id y paginación sin duplicados', async () => {
    const ongoing = await db.booking.create({
      data: {
        organizationId: north.id,
        clientId,
        serviceId: north.serviceId,
        professionalId: north.professionalId,
        status: 'CONFIRMED',
        startTime: new Date(Date.now() - 60000),
        endTime: new Date(Date.now() + 600000),
      },
    });
    const upcoming = (await get(`/customer/${north.slug}/bookings`).expect(200))
      .body as Page;
    expect(upcoming.items.some((b) => b.id === ongoing.id)).toBe(true);
    for (let i = 0; i < 3; i++)
      await db.booking.create({
        data: {
          organizationId: north.id,
          clientId,
          serviceId: north.serviceId,
          professionalId: north.professionalId,
          status: 'CANCELLED',
          startTime: new Date('2110-01-01T00:00:00Z'),
          endTime: new Date('2110-01-01T00:30:00Z'),
        },
      });
    const ids: string[] = [];
    let cursor: string | null = null;
    let asOf: string | null = null;
    do {
      const page = (
        await get(
          `/customer/${north.slug}/bookings?view=history&limit=1${cursor ? `&cursor=${cursor}` : ''}`,
        ).expect(200)
      ).body as Page;
      if (asOf) expect(page.asOf).toBe(asOf);
      else asOf = page.asOf;
      ids.push(...page.items.map((b) => b.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, 3)).toEqual([...ids.slice(0, 3)].sort().reverse());
    expect(ids).not.toContain(ongoing.id);
  });

  it('cambio SQL de fecha/estado invalida continuación sin depender del ORM', async () => {
    const page = (
      await get(`/customer/${north.slug}/bookings?limit=1`).expect(200)
    ).body as Page;
    await db.$executeRaw`UPDATE "Booking" SET "status" = 'CANCELLED' WHERE "id" = ${original}`;
    await get(
      `/customer/${north.slug}/bookings?cursor=${page.nextCursor}`,
    ).expect(409);
    await db.$executeRaw`UPDATE "Booking" SET "status" = 'PENDING' WHERE "id" = ${original}`;
  });

  it('dos procesos con igual clave: una Booking PENDING, recibo, evento y auditoría', async () => {
    const key = randomUUID();
    const results = await Promise.all([
      create(slot(2), key, first, {
        emailNotifications: {
          optedIn: true,
          noticeVersion: EMAIL_NOTICE_VERSION,
        },
      }),
      create(slot(2), key, second, {
        emailNotifications: {
          optedIn: true,
          noticeVersion: EMAIL_NOTICE_VERSION,
        },
      }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 201]);
    const body = results[0].body as { booking: Detail };
    expect(results[1].body).toEqual(results[0].body);
    expect(body.booking.status).toBe('PENDING');
    expect(body.booking.id).not.toBe(original);
    expect(
      await db.booking.count({
        where: {
          organizationId: north.id,
          clientId,
          startTime: new Date(slot(2)),
        },
      }),
    ).toBe(1);
    expect(
      await db.customerOperation.count({
        where: { bookingId: body.booking.id },
      }),
    ).toBe(1);
    expect(
      await db.bookingEmailEvent.count({
        where: { bookingId: body.booking.id },
      }),
    ).toBe(1);
    expect(
      await db.emailOutbox.count({ where: { bookingId: body.booking.id } }),
    ).toBe(1);
    expect(
      await db.auditLog.count({
        where: { entityId: body.booking.id, action: 'CREATE' },
      }),
    ).toBe(1);
    expect(
      (await db.booking.findUniqueOrThrow({ where: { id: original } })).status,
    ).toBe('PENDING');
    await create(slot(3), key).expect(409);
    await db.client.update({ where: { id: clientId }, data: { userId: null } });
    await create(slot(2), key).expect(404);
    await db.client.update({ where: { id: clientId }, data: { userId } });
    expect(
      (await db.client.findUniqueOrThrow({ where: { id: clientId } }))
        .customerAccessBlocked,
    ).toBe(true);
    await claim(north, original).expect(200);
  });

  it('dos claves para mismo slot: exclusión y rollback de recibo/eventos', async () => {
    const before = await db.customerOperation.count();
    const results = await Promise.all([
      create(slot(3), randomUUID(), first),
      create(slot(3), randomUUID(), second),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await db.customerOperation.count()).toBe(before + 1);
  });

  it('recibo vencido no reenvía, conflicto y reserva conservada', async () => {
    const key = randomUUID();
    const result = await create(slot(4), key).expect(201);
    const id = (result.body as { booking: Detail }).booking.id;
    await db.customerOperation.updateMany({
      where: { bookingId: id },
      data: {
        createdAt: new Date(Date.now() - 86500000),
        expiresAt: new Date(Date.now() - 100000),
      },
    });
    await create(slot(4), key).expect(409);
    expect(await db.booking.count({ where: { id } })).toBe(1);
  });

  it('servicio/profesional ajenos o retirados y campos forjados no crean reservas', async () => {
    const before = await db.booking.count();
    await create(slot(5), randomUUID(), first, {
      serviceId: south.serviceId,
    }).expect(400);
    await create(slot(5), randomUUID(), first, {
      professionalId: south.professionalId,
    }).expect(400);
    await create(slot(5), randomUUID(), first, {
      clientId: otherClientId,
    }).expect(400);
    await create(slot(5), randomUUID(), first, { status: 'CONFIRMED' }).expect(
      400,
    );
    await create(slot(5), randomUUID(), first, {
      startTime: '2099-02-05T13:00:00',
    }).expect(400);
    await db.service.update({
      where: { id: north.serviceId },
      data: { isActive: false },
    });
    await db.securityRateBucket.deleteMany();
    await create(slot(5)).expect(400);
    expect(
      (
        (await get(`/customer/${north.slug}/bookings/${original}`).expect(200))
          .body as Detail
      ).canBookAgain,
    ).toBe(false);
    await db.service.update({
      where: { id: north.serviceId },
      data: { isActive: true },
    });
    expect(await db.booking.count()).toBe(before);
  });

  it('alta exige clave opaca y no acepta contacto/consentimiento no aprobado', async () => {
    const dto = {
      serviceId: north.serviceId,
      professionalId: north.professionalId,
      startTime: slot(6),
    };
    await request(first)
      .post(`/customer/${north.slug}/bookings`)
      .auth(actor, { type: 'bearer' })
      .send(dto)
      .expect(400);
    await create(slot(6), 'email@test.invalid').expect(400);
    await create(slot(6), randomUUID(), first, {
      emailNotifications: {
        optedIn: true,
        noticeVersion: EMAIL_NOTICE_VERSION,
        reviewedEmail: 'forged@test.invalid',
      },
    }).expect(400);
    await create(slot(6), randomUUID(), first, {
      clientName: 'Otro contacto',
    }).expect(400);
  });

  it('retirado conserva historia sin contacto publicado; archivo bloquea mutaciones e inactivo da 404', async () => {
    await db.cmsPage.update({
      where: { organizationId: north.id },
      data: { isPublished: false },
    });
    const result = (
      await get(`/customer/${north.slug}/bookings/${original}`).expect(200)
    ).body as Detail;
    expect(result.business.phone).toBeNull();
    expect(result.business.address).toBeNull();
    expect(result.actions).toEqual({ canBookAgain: false });
    await create(slot(5)).expect(409);
    await db.cmsPage.update({
      where: { organizationId: north.id },
      data: { isPublished: true },
    });
    await db.client.update({
      where: { id: clientId },
      data: { isActive: false },
    });
    expect(
      (
        (await get(`/customer/${north.slug}/profile`).expect(200))
          .body as Profile
      ).canEditContact,
    ).toBe(false);
    await profile({ name: 'Intento' }).expect(409);
    await create(slot(5)).expect(409);
    await db.client.update({
      where: { id: clientId },
      data: { isActive: true },
    });
    await db.organization.update({
      where: { id: north.id },
      data: { isActive: false },
    });
    await get(`/customer/${north.slug}/profile`).expect(404);
    await db.organization.update({
      where: { id: north.id },
      data: { isActive: true },
    });
  });

  it('fallo de recibo o auditoría revierte reserva, preferencia, evento e intención juntos', async () => {
    for (const table of ['CustomerOperation', 'AuditLog']) {
      const before = await Promise.all([
        db.booking.count(),
        db.customerOperation.count(),
        db.bookingEmailPreference.count(),
        db.bookingEmailEvent.count(),
        db.emailOutbox.count(),
      ]);
      await db.$executeRawUnsafe(
        `CREATE FUNCTION m2_fail_atomic() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic atomic failure'; END $$`,
      );
      await db.$executeRawUnsafe(
        `CREATE TRIGGER m2_fail_atomic BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION m2_fail_atomic()`,
      );
      try {
        const result = await create(slot(7)).expect(503);
        expect(JSON.stringify(result.body)).not.toMatch(
          /Prisma|P200|trigger|synthetic|constraint/,
        );
        expect(
          await Promise.all([
            db.booking.count(),
            db.customerOperation.count(),
            db.bookingEmailPreference.count(),
            db.bookingEmailEvent.count(),
            db.emailOutbox.count(),
          ]),
        ).toEqual(before);
      } finally {
        await db.$executeRawUnsafe(`DROP TRIGGER m2_fail_atomic ON "${table}"`);
        await db.$executeRawUnsafe('DROP FUNCTION m2_fail_atomic()');
      }
    }
  });

  it('FK compuesta niega recibo con Booking de otro tenant y CHECK niega retención inválida', async () => {
    const southClient = await db.client.findFirstOrThrow({
      where: { organizationId: south.id, userId },
    });
    const data = {
      organizationId: south.id,
      actorUserId: userId,
      clientId: southClient.id,
      operation: 'CREATE_BOOKING',
      keyDigest: 'a'.repeat(64),
      commandDigest: 'b'.repeat(64),
      bookingId: original,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86000000),
    };
    await expect(db.customerOperation.create({ data })).rejects.toMatchObject({
      code: 'P2003',
    });
    await expect(
      db.customerOperation.create({
        data: {
          ...data,
          organizationId: north.id,
          clientId,
          expiresAt: new Date(Date.now() + 90000000),
        },
      }),
    ).rejects.toBeDefined();
  });

  it('misma clave en otro actor es independiente y no devuelve su reserva', async () => {
    const key = randomUUID();
    const own = await create(slot(8), key).expect(201);
    const other = await request(second)
      .post(`/customer/${north.slug}/bookings`)
      .auth(stranger, { type: 'bearer' })
      .set('Idempotency-Key', key)
      .send({
        serviceId: north.serviceId,
        professionalId: north.professionalId,
        startTime: slot(9),
      })
      .expect(201);
    expect((own.body as { booking: Detail }).booking.id).not.toBe(
      (other.body as { booking: Detail }).booking.id,
    );
    await get(
      `/customer/${north.slug}/bookings/${(own.body as { booking: Detail }).booking.id}`,
      stranger,
    ).expect(404);
  });

  it('lecturas 60, perfil 10 y alta 5 por actor/negocio compartidos entre procesos', async () => {
    const paths = Array.from({ length: 61 }, (_, index) =>
      get(`/customer/${north.slug}/profile`, actor, index % 2 ? first : second),
    );
    const responses = await Promise.all(paths);
    expect(responses.filter((r) => r.status === 200)).toHaveLength(60);
    const blocked = responses.find((r) => r.status === 429)!;
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    await db.securityRateBucket.deleteMany();
    for (let i = 0; i < 10; i++)
      await profile({ name: 'Cliente prueba' }).expect(200);
    await profile({ name: 'Cliente prueba' }).expect(429);
    await db.securityRateBucket.deleteMany();
    for (let i = 0; i < 5; i++)
      await create(slot(6), randomUUID(), i % 2 ? first : second, {
        serviceId: south.serviceId,
      }).expect(400);
    await create(slot(6)).expect(429);
    const buckets = await db.securityRateBucket.findMany();
    expect(buckets.every((b) => /^[a-f0-9]{64}$/.test(b.key))).toBe(true);
  }, 30000);

  it('techo IP 180 no se elude rotando actor/slug', async () => {
    for (let i = 0; i < 180; i++)
      await get(
        `/customer/${randomUUID()}/profile`,
        `m2_test_${randomUUID()}`,
        i % 2 ? first : second,
      ).expect(404);
    await get('/customer/businesses', `m2_test_${randomUUID()}`).expect(429);
  }, 30000);

  it('limpieza M2 compartida elimina como máximo cien contadores antiguos por pasada', async () => {
    await db.securityRateBucket.createMany({
      data: Array.from({ length: 105 }, (_, i) => ({
        key: i.toString(16).padStart(64, '0'),
        count: 1,
        expiresAt: new Date(Date.now() - 172800000),
      })),
    });
    const storage = new PostgresThrottlerStorage(
      { db } as unknown as PrismaService,
      process.env.JWT_SECRET!,
      100,
    );
    await storage.increment('synthetic-cleanup', 60000, 5, 60000, 'customer');
    let remaining = 105;
    for (let i = 0; i < 20 && remaining === 105; i++) {
      await new Promise((done) => setTimeout(done, 10));
      remaining = await db.securityRateBucket.count({
        where: { expiresAt: { lt: new Date(Date.now() - 86400000) } },
      });
    }
    expect(remaining).toBe(5);
  });

  it('D8-A: correo legacy existente/nuevo y fallo real secundario tienen mismos indicadores; fail-open', async () => {
    const existingEmail = `${randomUUID()}@test.invalid`;
    await db.user.create({
      data: {
        name: 'Legacy sintético',
        email: existingEmail,
        password: 'fixture-no-login',
      },
    });
    const reserve = (email: string, phone: string, day: number) =>
      request(first)
        .post(`/public/${north.slug}/bookings`)
        .send({
          serviceId: north.serviceId,
          professionalId: north.professionalId,
          startTime: slot(day),
          clientName: 'Legacy M2',
          clientEmail: email,
          clientPhone: phone,
          createAccount: true,
          password: 'Synthetic-Password-2099!',
        });
    const existingStarted = performance.now();
    const existed = await reserve(existingEmail, '+18095550201', 20).expect(
      201,
    );
    const existingMs = Math.round(performance.now() - existingStarted);
    const freshEmail = `${randomUUID()}@test.invalid`;
    const freshStarted = performance.now();
    const fresh = await reserve(freshEmail, '+18095550202', 21).expect(201);
    const freshMs = Math.round(performance.now() - freshStarted);
    console.log(
      `M2_D8_TIMING ${JSON.stringify({ existingMs, freshMs, samplesPerCase: 1, constantTimeProven: false })}`,
    );
    const indicators = (body: unknown) => {
      const value = body as {
        accountCreated: boolean;
        accountCreationError: string | null;
        booking: Summary;
      };
      return {
        accountCreated: value.accountCreated,
        accountCreationError: value.accountCreationError,
        status: value.booking.status,
        keys: Object.keys(value).sort(),
      };
    };
    expect(indicators(existed.body)).toEqual(indicators(fresh.body));
    expect(indicators(fresh.body)).toMatchObject({
      accountCreated: false,
      accountCreationError: null,
      status: 'PENDING',
    });
    expect(
      await db.membership.count({
        where: {
          organizationId: north.id,
          user: { email: freshEmail },
          role: 'CUSTOMER',
        },
      }),
    ).toBe(1);
    const login = await request(first)
      .post('/auth/login')
      .send({ email: freshEmail, password: 'Synthetic-Password-2099!' })
      .expect(201);
    expect((login.body as { accessToken: string }).accessToken).toEqual(
      expect.any(String),
    );
    await get(
      '/customer/businesses',
      (login.body as { accessToken: string }).accessToken,
    ).expect(401);
    // Trigger solo en DB desechable: fallo secundario después de confirmar Booking.
    await db.$executeRawUnsafe(
      `CREATE FUNCTION m2_fail_user() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic secondary failure'; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER m2_fail_user BEFORE INSERT ON "User" FOR EACH ROW EXECUTE FUNCTION m2_fail_user()`,
    );
    try {
      const failed = await reserve(
        `${randomUUID()}@test.invalid`,
        '+18095550203',
        22,
      ).expect(201);
      expect(indicators(failed.body)).toEqual(indicators(fresh.body));
      const id = (failed.body as { booking: Summary }).booking.id;
      expect(
        (await db.booking.findUniqueOrThrow({ where: { id } })).status,
      ).toBe('PENDING');
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER m2_fail_user ON "User"');
      await db.$executeRawUnsafe('DROP FUNCTION m2_fail_user()');
    }
  });
});
