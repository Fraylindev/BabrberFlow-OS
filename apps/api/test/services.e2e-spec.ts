import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BookingStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, requestApp } from './create-e2e-app';

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected an object response');
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error('Expected an array response');
  return value.map(asRecord);
}

describe('Servicios — Entrega A Backend (e2e PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantAId: string;
  let tenantASlug: string;
  let tenantBId: string;
  let ownerAId: string;
  let adminAId: string;
  let historicalServiceId: string;
  let inactiveServiceId: string;
  let tenantBServiceId: string;
  let bookingId: string;
  let invoiceId: string;
  let ownerToken: string;
  let adminToken: string;
  let barberToken: string;
  let receptionistToken: string;
  let customerToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);
    const jwt = app.get(JwtService);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const [tenantA, tenantB] = await Promise.all([
      prisma.db.organization.create({
        data: {
          name: 'Servicios tenant A',
          slug: `services-a-${suffix}`,
          email: `services-a-${suffix}@organization.test`,
        },
      }),
      prisma.db.organization.create({
        data: {
          name: 'Servicios tenant B',
          slug: `services-b-${suffix}`,
          email: `services-b-${suffix}@organization.test`,
        },
      }),
    ]);
    tenantAId = tenantA.id;
    tenantASlug = tenantA.slug;
    tenantBId = tenantB.id;

    const roleFixtures: Array<readonly [string, UserRole]> = [
      ['Owner servicios', UserRole.OWNER],
      ['Admin servicios', UserRole.ADMIN],
      ['Barber servicios', UserRole.BARBER],
      ['Recepción servicios', UserRole.RECEPTIONIST],
      ['Customer servicios', UserRole.CUSTOMER],
    ];
    const users = await Promise.all(
      roleFixtures.map(async ([name, role]) => {
        const user = await prisma.db.user.create({
          data: {
            name,
            email: `${String(role).toLowerCase()}-${suffix}@identity.test`,
            password: null,
          },
        });
        await prisma.db.membership.create({
          data: { userId: user.id, organizationId: tenantAId, role },
        });
        return { id: user.id, role };
      }),
    );
    ownerAId = users.find((user) => user.role === UserRole.OWNER)!.id;
    adminAId = users.find((user) => user.role === UserRole.ADMIN)!.id;

    const tokenByRole = new Map(
      await Promise.all(
        users.map(
          async (user) =>
            [
              user.role,
              await jwt.signAsync({ sub: user.id, organizationId: tenantAId }),
            ] as const,
        ),
      ),
    );
    ownerToken = tokenByRole.get(UserRole.OWNER)!;
    adminToken = tokenByRole.get(UserRole.ADMIN)!;
    barberToken = tokenByRole.get(UserRole.BARBER)!;
    receptionistToken = tokenByRole.get(UserRole.RECEPTIONIST)!;
    customerToken = tokenByRole.get(UserRole.CUSTOMER)!;

    const [historicalService, inactiveService, tenantBService] =
      await Promise.all([
        prisma.db.service.create({
          data: {
            organizationId: tenantAId,
            name: 'A histórico con reserva',
            description: 'Debe conservar su historial',
            duration: 30,
            price: new Prisma.Decimal('500.00'),
          },
        }),
        prisma.db.service.create({
          data: {
            organizationId: tenantAId,
            name: 'B inactivo',
            duration: 45,
            price: new Prisma.Decimal('600.00'),
            isActive: false,
          },
        }),
        prisma.db.service.create({
          data: {
            organizationId: tenantBId,
            name: 'Servicio tenant B',
            duration: 60,
            price: new Prisma.Decimal('700.00'),
          },
        }),
      ]);
    historicalServiceId = historicalService.id;
    inactiveServiceId = inactiveService.id;
    tenantBServiceId = tenantBService.id;

    const [client, professional] = await Promise.all([
      prisma.db.client.create({
        data: { organizationId: tenantAId, name: 'Cliente historial' },
      }),
      prisma.db.professional.create({
        data: { organizationId: tenantAId, name: 'Profesional historial' },
      }),
    ]);
    const booking = await prisma.db.booking.create({
      data: {
        organizationId: tenantAId,
        clientId: client.id,
        professionalId: professional.id,
        serviceId: historicalServiceId,
        startTime: new Date('2025-01-15T14:00:00.000Z'),
        endTime: new Date('2025-01-15T14:30:00.000Z'),
        status: BookingStatus.COMPLETED,
      },
    });
    bookingId = booking.id;
    invoiceId = (
      await prisma.db.invoice.create({
        data: {
          organizationId: tenantAId,
          bookingId,
          amount: new Prisma.Decimal('500.00'),
        },
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('crea con textos normalizados, proyección mínima y AuditLog sin PII', async () => {
    const response = await requestApp(app)
      .post('/services')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: '  C servicio creado  ',
        description: '  Descripción pública  ',
        duration: 40,
        price: 750.5,
      })
      .expect(201);

    const body = asRecord(response.body as unknown);
    expect(typeof body.id).toBe('string');
    expect(body).toEqual({
      id: body.id,
      name: 'C servicio creado',
      description: 'Descripción pública',
      duration: 40,
      price: '750.50',
      isActive: true,
    });
    expect(body).not.toHaveProperty('organizationId');
    expect(body).not.toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('updatedAt');

    const audit = await prisma.db.auditLog.findFirstOrThrow({
      where: {
        organizationId: tenantAId,
        userId: ownerAId,
        action: 'CREATE',
        entity: 'Service',
        entityId: String(body.id),
      },
    });
    expect(audit).not.toHaveProperty('name');
    expect(audit).not.toHaveProperty('description');
  });

  it.each([
    { name: '   ', duration: 30, price: 100 },
    { name: 'x'.repeat(121), duration: 30, price: 100 },
    {
      name: 'Inválido',
      description: 'x'.repeat(1001),
      duration: 30,
      price: 100,
    },
    { name: 'Inválido', duration: 30.5, price: 100 },
    { name: 'Inválido', duration: 1441, price: 100 },
    { name: 'Inválido', duration: 30, price: 125.555 },
  ])('rechaza DTO de creación inválido %#', async (payload) => {
    await requestApp(app)
      .post('/services')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(payload)
      .expect(400);
  });

  it('lista todos por defecto y filtra estado antes de responder', async () => {
    const all = await requestApp(app)
      .get('/services')
      .set('Authorization', `Bearer ${barberToken}`)
      .expect(200);
    const allItems = asArray(all.body as unknown);
    expect(allItems.some((item) => item.id === historicalServiceId)).toBe(true);
    expect(allItems.some((item) => item.id === inactiveServiceId)).toBe(true);
    expect(allItems.some((item) => item.id === tenantBServiceId)).toBe(false);
    for (const item of allItems) {
      expect(Object.keys(item).sort()).toEqual(
        ['description', 'duration', 'id', 'isActive', 'name', 'price'].sort(),
      );
    }
    const names = allItems.map((item) => String(item.name));
    expect(names).toEqual([...names].sort());

    const active = asArray(
      (
        await requestApp(app)
          .get('/services?isActive=true')
          .set('Authorization', `Bearer ${receptionistToken}`)
          .expect(200)
      ).body as unknown,
    );
    expect(active.length).toBeGreaterThan(0);
    expect(active.every((item) => item.isActive === true)).toBe(true);

    const inactive = asArray(
      (
        await requestApp(app)
          .get('/services?isActive=false')
          .set('Authorization', `Bearer ${barberToken}`)
          .expect(200)
      ).body as unknown,
    );
    expect(inactive.map((item) => item.id)).toContain(inactiveServiceId);
    expect(inactive.every((item) => item.isActive === false)).toBe(true);

    await requestApp(app)
      .get('/services?isActive=all')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
  });

  it('obtiene por UUID dentro del tenant y oculta recursos ajenos', async () => {
    await requestApp(app)
      .get(`/services/${historicalServiceId}`)
      .set('Authorization', `Bearer ${barberToken}`)
      .expect(200)
      .expect((response) => {
        expect(asRecord(response.body as unknown)).toEqual(
          expect.objectContaining({ id: historicalServiceId }),
        );
      });

    await requestApp(app)
      .get(`/services/${tenantBServiceId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
    await requestApp(app)
      .get('/services/not-a-uuid')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
  });

  it('reserva las mutaciones a OWNER/ADMIN y excluye CUSTOMER del catálogo B2B', async () => {
    for (const token of [barberToken, receptionistToken]) {
      await requestApp(app)
        .post('/services')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sin permiso', duration: 30, price: 100 })
        .expect(403);
      await requestApp(app)
        .patch(`/services/${historicalServiceId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sin permiso' })
        .expect(403);
      await requestApp(app)
        .delete(`/services/${historicalServiceId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      await requestApp(app)
        .patch(`/services/${inactiveServiceId}/reactivate`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    }

    await requestApp(app)
      .get('/services')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('edita con ADMIN, audita y rechaza modificar estado por PATCH general', async () => {
    const response = await requestApp(app)
      .patch(`/services/${historicalServiceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '  A histórico editado  ', price: 525 })
      .expect(200);
    expect(asRecord(response.body as unknown)).toEqual(
      expect.objectContaining({
        id: historicalServiceId,
        name: 'A histórico editado',
        price: '525.00',
        isActive: true,
      }),
    );

    expect(
      await prisma.db.auditLog.count({
        where: {
          organizationId: tenantAId,
          userId: adminAId,
          action: 'UPDATE',
          entity: 'Service',
          entityId: historicalServiceId,
        },
      }),
    ).toBe(1);

    await requestApp(app)
      .patch(`/services/${historicalServiceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(400);
    expect(
      await prisma.db.service.findUniqueOrThrow({
        where: { id: historicalServiceId },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: true });
  });

  it('desactiva sin borrar ni romper Booking, Invoice o el catálogo público', async () => {
    const publicBefore = asRecord(
      (
        await requestApp(app)
          .get(`/public/${tenantASlug}/booking-data`)
          .expect(200)
      ).body as unknown,
    );
    expect(
      asArray(publicBefore.services).some(
        (service) => service.id === historicalServiceId,
      ),
    ).toBe(true);

    await requestApp(app)
      .delete(`/services/${historicalServiceId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect((response) => {
        expect(asRecord(response.body as unknown)).toEqual(
          expect.objectContaining({
            id: historicalServiceId,
            isActive: false,
          }),
        );
      });

    expect(
      await prisma.db.service.findUniqueOrThrow({
        where: { id: historicalServiceId },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: false });
    expect(
      await prisma.db.booking.count({
        where: { id: bookingId, serviceId: historicalServiceId },
      }),
    ).toBe(1);
    expect(
      await prisma.db.invoice.count({
        where: { id: invoiceId, bookingId },
      }),
    ).toBe(1);

    await requestApp(app)
      .get(`/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const bookings = asArray(
      (
        await requestApp(app)
          .get('/bookings')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200)
      ).body as unknown,
    );
    expect(bookings.some((booking) => booking.id === bookingId)).toBe(true);

    const publicAfter = asRecord(
      (
        await requestApp(app)
          .get(`/public/${tenantASlug}/booking-data`)
          .expect(200)
      ).body as unknown,
    );
    expect(
      asArray(publicAfter.services).some(
        (service) => service.id === historicalServiceId,
      ),
    ).toBe(false);

    expect(
      await prisma.db.auditLog.count({
        where: {
          organizationId: tenantAId,
          userId: ownerAId,
          action: 'DEACTIVATE',
          entity: 'Service',
          entityId: historicalServiceId,
        },
      }),
    ).toBe(1);
  });

  it('hace la baja idempotente y permite reactivar explícitamente', async () => {
    await requestApp(app)
      .delete(`/services/${historicalServiceId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(
      await prisma.db.auditLog.count({
        where: {
          organizationId: tenantAId,
          action: 'DEACTIVATE',
          entity: 'Service',
          entityId: historicalServiceId,
        },
      }),
    ).toBe(1);

    await requestApp(app)
      .patch(`/services/${historicalServiceId}/reactivate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((response) => {
        expect(asRecord(response.body as unknown).isActive).toBe(true);
      });
    expect(
      await prisma.db.auditLog.count({
        where: {
          organizationId: tenantAId,
          userId: adminAId,
          action: 'REACTIVATE',
          entity: 'Service',
          entityId: historicalServiceId,
        },
      }),
    ).toBe(1);
  });

  it('protege desactivación y reactivación frente a IDOR', async () => {
    await requestApp(app)
      .delete(`/services/${tenantBServiceId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
    await requestApp(app)
      .patch(`/services/${tenantBServiceId}/reactivate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(
      await prisma.db.service.findUniqueOrThrow({
        where: { id: tenantBServiceId },
        select: { organizationId: true, isActive: true },
      }),
    ).toEqual({ organizationId: tenantBId, isActive: true });
  });
});
