import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BookingStatus, PaymentMethod, UserRole } from '@prisma/client';
import { AuditService } from '../src/audit/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, requestApp } from './create-e2e-app';

interface Identity {
  id: string;
  email: string;
}

interface TenantFixture {
  id: string;
  serviceId: string;
  clientId: string;
}

interface BookingFixture {
  id: string;
  professionalId: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected an object response');
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Expected an array response');
  return value;
}

describe('Facturación-A Backend (e2e PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let tenantA: TenantFixture;
  let tenantB: TenantFixture;
  let owner: Identity;
  let admin: Identity;
  let receptionist: Identity;
  let barberA: Identity;
  let barberB: Identity;
  let unlinkedBarber: Identity;
  let customer: Identity;
  let ownerToken: string;
  let adminToken: string;
  let receptionistToken: string;
  let barberAToken: string;
  let barberBToken: string;
  let unlinkedToken: string;
  let customerToken: string;
  let completedOwner: BookingFixture;
  let completedAdmin: BookingFixture;
  let completedReception: BookingFixture;
  let completedBarberA: BookingFixture;
  let confirmedBarberA: BookingFixture;
  let futureBarberA: BookingFixture;
  let completedBarberB: BookingFixture;
  let privilegedFieldsInvoiceId: string;

  const unique = (label: string) =>
    `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  async function createTenant(label: string): Promise<TenantFixture> {
    const suffix = unique(label);
    const organization = await prisma.db.organization.create({
      data: {
        name: `Tenant ${label}`,
        slug: suffix,
        email: `${suffix}@organization.test`,
        timeZone: 'America/Santo_Domingo',
      },
    });
    const [service, client] = await Promise.all([
      prisma.db.service.create({
        data: {
          organizationId: organization.id,
          name: `Servicio ${label}`,
          duration: 30,
          price: '125.50',
        },
      }),
      prisma.db.client.create({
        data: {
          organizationId: organization.id,
          name: `Cliente ${label}`,
          email: `${suffix}@client.test`,
          phone: '+18095550000',
          notes: 'Nota privada que no debe exponerse',
        },
      }),
    ]);
    return {
      id: organization.id,
      serviceId: service.id,
      clientId: client.id,
    };
  }

  async function createIdentity(label: string): Promise<Identity> {
    const suffix = unique(label);
    return prisma.db.user.create({
      data: {
        name: `Usuario ${label}`,
        email: `${suffix}@identity.test`,
        password: null,
      },
      select: { id: true, email: true },
    });
  }

  async function addMembership(
    identity: Identity,
    organizationId: string,
    role: UserRole,
  ) {
    await prisma.db.membership.create({
      data: { userId: identity.id, organizationId, role },
    });
  }

  async function tokenFor(
    identity: Identity,
    organizationId: string,
    role: UserRole,
  ) {
    return jwt.signAsync({
      sub: identity.id,
      email: identity.email,
      role,
      organizationId,
    });
  }

  async function createProfessional(
    tenant: TenantFixture,
    label: string,
    identity?: Identity,
  ) {
    return prisma.db.professional.create({
      data: {
        organizationId: tenant.id,
        name: `Profesional ${label}`,
        status: 'ACTIVE',
        isPublic: true,
        userId: identity?.id,
      },
    });
  }

  async function createBooking(
    tenant: TenantFixture,
    professionalId: string,
    status: BookingStatus,
    offsetMinutes: number,
  ): Promise<BookingFixture> {
    const startTime = new Date(
      Date.UTC(2026, 7, 20, 12, 0) + offsetMinutes * 60_000,
    );
    return prisma.db.booking.create({
      data: {
        organizationId: tenant.id,
        clientId: tenant.clientId,
        professionalId,
        serviceId: tenant.serviceId,
        startTime,
        endTime: new Date(startTime.getTime() + 30 * 60_000),
        status,
      },
      select: { id: true, professionalId: true },
    });
  }

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    tenantA = await createTenant('A');
    tenantB = await createTenant('B');
    [owner, admin, receptionist, barberA, barberB, unlinkedBarber, customer] =
      await Promise.all([
        createIdentity('owner'),
        createIdentity('admin'),
        createIdentity('reception'),
        createIdentity('barber-a'),
        createIdentity('barber-b'),
        createIdentity('barber-unlinked'),
        createIdentity('customer'),
      ]);
    await Promise.all([
      addMembership(owner, tenantA.id, UserRole.OWNER),
      addMembership(admin, tenantA.id, UserRole.ADMIN),
      addMembership(receptionist, tenantA.id, UserRole.RECEPTIONIST),
      addMembership(barberA, tenantA.id, UserRole.BARBER),
      addMembership(unlinkedBarber, tenantA.id, UserRole.BARBER),
      addMembership(customer, tenantA.id, UserRole.CUSTOMER),
      addMembership(owner, tenantB.id, UserRole.BARBER),
      addMembership(barberB, tenantB.id, UserRole.BARBER),
    ]);
    [
      ownerToken,
      adminToken,
      receptionistToken,
      barberAToken,
      barberBToken,
      unlinkedToken,
      customerToken,
    ] = await Promise.all([
      tokenFor(owner, tenantA.id, UserRole.OWNER),
      tokenFor(admin, tenantA.id, UserRole.ADMIN),
      tokenFor(receptionist, tenantA.id, UserRole.RECEPTIONIST),
      tokenFor(barberA, tenantA.id, UserRole.BARBER),
      tokenFor(barberB, tenantB.id, UserRole.BARBER),
      tokenFor(unlinkedBarber, tenantA.id, UserRole.BARBER),
      tokenFor(customer, tenantA.id, UserRole.CUSTOMER),
    ]);
    const [professionalOwner, professionalAdmin, professionalReception] =
      await Promise.all([
        createProfessional(tenantA, 'owner'),
        createProfessional(tenantA, 'admin'),
        createProfessional(tenantA, 'reception'),
      ]);
    const professionalBarberA = await createProfessional(
      tenantA,
      'barber-a',
      barberA,
    );
    const professionalBarberB = await createProfessional(
      tenantB,
      'barber-b',
      barberB,
    );
    await createProfessional(tenantB, 'owner-role-b', owner);
    [
      completedOwner,
      completedAdmin,
      completedReception,
      completedBarberA,
      confirmedBarberA,
      completedBarberB,
    ] = await Promise.all([
      createBooking(tenantA, professionalOwner.id, BookingStatus.COMPLETED, 0),
      createBooking(tenantA, professionalAdmin.id, BookingStatus.COMPLETED, 60),
      createBooking(
        tenantA,
        professionalReception.id,
        BookingStatus.COMPLETED,
        120,
      ),
      createBooking(
        tenantA,
        professionalBarberA.id,
        BookingStatus.COMPLETED,
        180,
      ),
      createBooking(
        tenantA,
        professionalBarberA.id,
        BookingStatus.CONFIRMED,
        240,
      ),
      createBooking(
        tenantB,
        professionalBarberB.id,
        BookingStatus.COMPLETED,
        300,
      ),
    ]);
    const futureStartTime = new Date(Date.now() + 2 * 60 * 60_000);
    futureBarberA = await prisma.db.booking.create({
      data: {
        organizationId: tenantA.id,
        clientId: tenantA.clientId,
        professionalId: professionalBarberA.id,
        serviceId: tenantA.serviceId,
        startTime: futureStartTime,
        endTime: new Date(futureStartTime.getTime() + 30 * 60_000),
        status: BookingStatus.CONFIRMED,
      },
      select: { id: true, professionalId: true },
    });
  });

  afterAll(async () => app.close());

  it('rechaza amount y campos autoritativos enviados por el cliente', async () => {
    const response = await requestApp(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bookingId: completedOwner.id,
        amount: 1,
        organizationId: tenantB.id,
        state: 'PAID',
        paidAt: new Date().toISOString(),
        recordedByUserId: owner.id,
      });
    expect(response.status).toBe(400);
    const body = JSON.stringify(response.body);
    for (const field of [
      'amount',
      'organizationId',
      'state',
      'paidAt',
      'recordedByUserId',
    ]) {
      expect(body).toContain(field);
    }
    expect(
      await prisma.db.invoice.count({
        where: { bookingId: completedOwner.id },
      }),
    ).toBe(0);
  });

  it('rechaza Service.price inválido al crear, editar y persistir', async () => {
    for (const price of [0, 125.555]) {
      const response = await requestApp(app)
        .post('/services')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: `Servicio inválido ${price}`, duration: 30, price });
      expect(response.status).toBe(400);
    }

    const created = await requestApp(app)
      .post('/services')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Servicio monetario QA', duration: 30, price: 125.55 });
    expect(created.status).toBe(201);
    const serviceId = asRecord(created.body as unknown).id;
    if (typeof serviceId !== 'string') throw new Error('Missing Service id');

    for (const price of [0, 125.555]) {
      const response = await requestApp(app)
        .patch(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ price });
      expect(response.status).toBe(400);
    }

    const updated = await requestApp(app)
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ price: 99.9 });
    expect(updated.status).toBe(200);
    const persisted = await prisma.db.service.findUniqueOrThrow({
      where: { id: serviceId },
      select: { price: true },
    });
    expect(persisted.price.toFixed(2)).toBe('99.90');

    await expect(
      prisma.db.service.create({
        data: {
          organizationId: tenantA.id,
          name: 'Servicio constraint QA',
          duration: 30,
          price: '0.00',
        },
      }),
    ).rejects.toThrow('Service_price_dop_check');
  });

  it('rechaza IDs de ruta inválidos antes de consultar Reservas o Servicios', async () => {
    const [bookingStatus, bookingReschedule, serviceUpdate, serviceDelete] =
      await Promise.all([
        requestApp(app)
          .patch('/bookings/not-a-uuid/status')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ status: BookingStatus.CONFIRMED }),
        requestApp(app)
          .patch('/bookings/not-a-uuid')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ startTime: new Date().toISOString() }),
        requestApp(app)
          .patch('/services/not-a-uuid')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ price: 100 }),
        requestApp(app)
          .delete('/services/not-a-uuid')
          .set('Authorization', `Bearer ${ownerToken}`),
      ]);

    for (const response of [
      bookingStatus,
      bookingReschedule,
      serviceUpdate,
      serviceDelete,
    ]) {
      expect(response.status).toBe(400);
    }
  });

  it('OWNER, ADMIN y RECEPTIONIST emiten desde el precio server-side', async () => {
    const cases = [
      [ownerToken, completedOwner.id],
      [adminToken, completedAdmin.id],
      [receptionistToken, completedReception.id],
    ];
    for (const [token, bookingId] of cases) {
      const response = await requestApp(app)
        .post('/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({ bookingId });
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        state: 'ISSUED',
        amount: '125.50',
        currency: 'DOP',
        payment: null,
      });
    }
  });

  it('OWNER, ADMIN y RECEPTIONIST listan y cobran dentro del tenant', async () => {
    const cases = [
      [ownerToken, completedOwner.id],
      [adminToken, completedAdmin.id],
      [receptionistToken, completedReception.id],
    ];
    for (const [token, bookingId] of cases) {
      const invoice = await prisma.db.invoice.findUniqueOrThrow({
        where: { bookingId },
      });
      const list = await requestApp(app)
        .get('/invoices?page=1&limit=100')
        .set('Authorization', `Bearer ${token}`);
      expect(list.status).toBe(200);
      expect(
        asArray(list.body as unknown).map((item) => asRecord(item).id),
      ).toContain(invoice.id);

      const payment = await requestApp(app)
        .post(`/invoices/${invoice.id}/payments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ method: PaymentMethod.CASH });
      expect(payment.status).toBe(201);
      expect(payment.body).toMatchObject({
        state: 'PAID',
        payment: { method: PaymentMethod.CASH },
      });
    }
  });

  it('rechaza PENDING, CONFIRMED, CANCELLED y NO_SHOW en PostgreSQL real', async () => {
    const professional = await createProfessional(tenantA, 'not-completed');
    const statuses = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
      BookingStatus.NO_SHOW,
    ];
    for (const [index, status] of statuses.entries()) {
      const booking = await createBooking(
        tenantA,
        professional.id,
        status,
        700 + index * 60,
      );
      const response = await requestApp(app)
        .post('/invoices')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ bookingId: booking.id });
      expect(response.status).toBe(409);
      expect(
        await prisma.db.invoice.count({ where: { bookingId: booking.id } }),
      ).toBe(0);
    }
  });

  it('rechaza campos privilegiados al cobrar sin crear Payment', async () => {
    const professional = await createProfessional(tenantA, 'payment-fields');
    const booking = await createBooking(
      tenantA,
      professional.id,
      BookingStatus.COMPLETED,
      960,
    );
    const issued = await requestApp(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bookingId: booking.id });
    expect(issued.status).toBe(201);
    const issuedId = asRecord(issued.body as unknown).id;
    if (typeof issuedId !== 'string') throw new Error('Missing Invoice id');
    privilegedFieldsInvoiceId = issuedId;

    const response = await requestApp(app)
      .post(`/invoices/${issuedId}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        method: PaymentMethod.CARD,
        amount: 1,
        paidAt: new Date(0).toISOString(),
        recordedByUserId: barberA.id,
        organizationId: tenantB.id,
      });
    expect(response.status).toBe(400);
    const body = JSON.stringify(response.body);
    for (const field of [
      'amount',
      'paidAt',
      'recordedByUserId',
      'organizationId',
    ]) {
      expect(body).toContain(field);
    }
    expect(
      await prisma.db.payment.count({ where: { invoiceId: issuedId } }),
    ).toBe(0);
  });

  it('una reserva futura no puede completarse, emitirse ni cobrarse', async () => {
    for (const token of [barberAToken, ownerToken]) {
      const completion = await requestApp(app)
        .patch(`/bookings/${futureBarberA.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: BookingStatus.COMPLETED });
      expect(completion.status).toBe(409);
    }
    expect(
      await prisma.db.booking.findUniqueOrThrow({
        where: { id: futureBarberA.id },
        select: { status: true },
      }),
    ).toEqual({ status: BookingStatus.CONFIRMED });

    const issueConfirmed = await requestApp(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bookingId: futureBarberA.id });
    expect(issueConfirmed.status).toBe(409);

    await prisma.db.booking.update({
      where: { id: futureBarberA.id },
      data: { status: BookingStatus.COMPLETED },
    });
    await requestApp(app)
      .patch(`/bookings/${futureBarberA.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: BookingStatus.COMPLETED })
      .expect(409);
    const issueHistorical = await requestApp(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bookingId: futureBarberA.id });
    expect(issueHistorical.status).toBe(409);

    const historicalInvoice = await prisma.db.invoice.create({
      data: {
        organizationId: tenantA.id,
        bookingId: futureBarberA.id,
        amount: '125.50',
        currency: 'DOP',
      },
    });
    const payment = await requestApp(app)
      .post(`/invoices/${historicalInvoice.id}/payments`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ method: PaymentMethod.CASH });
    expect(payment.status).toBe(409);
    expect(
      await prisma.db.payment.count({
        where: { invoiceId: historicalInvoice.id },
      }),
    ).toBe(0);
  });

  it('BARBER completa solo su Booking y no genera efectos financieros', async () => {
    const completed = await requestApp(app)
      .patch(`/bookings/${confirmedBarberA.id}/status`)
      .set('Authorization', `Bearer ${barberAToken}`)
      .send({ status: BookingStatus.COMPLETED });
    expect(completed.status).toBe(200);
    expect(completed.body).toMatchObject({ status: BookingStatus.COMPLETED });
    expect(
      await prisma.db.invoice.count({
        where: { bookingId: confirmedBarberA.id },
      }),
    ).toBe(0);

    const foreign = await requestApp(app)
      .patch(`/bookings/${completedOwner.id}/status`)
      .set('Authorization', `Bearer ${barberAToken}`)
      .send({ status: BookingStatus.COMPLETED });
    expect(foreign.status).toBe(404);
  });

  it('BARBER emite y consulta solo sus reservas; tenant ajeno es 404', async () => {
    const own = await requestApp(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${barberAToken}`)
      .send({ bookingId: completedBarberA.id });
    expect(own.status).toBe(201);

    const foreign = await requestApp(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${barberAToken}`)
      .send({ bookingId: completedOwner.id });
    expect(foreign.status).toBe(404);

    const ownerInvoice = await prisma.db.invoice.findUniqueOrThrow({
      where: { bookingId: completedOwner.id },
    });
    await requestApp(app)
      .get(`/invoices/${ownerInvoice.id}`)
      .set('Authorization', `Bearer ${barberAToken}`)
      .expect(404);
    await requestApp(app)
      .post(`/invoices/${ownerInvoice.id}/payments`)
      .set('Authorization', `Bearer ${barberAToken}`)
      .send({ method: PaymentMethod.CASH })
      .expect(404);

    const otherTenant = await requestApp(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${barberAToken}`)
      .send({ bookingId: completedBarberB.id });
    expect(otherTenant.status).toBe(404);

    const tenantBOwn = await requestApp(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${barberBToken}`)
      .send({ bookingId: completedBarberB.id });
    expect(tenantBOwn.status).toBe(201);
  });

  it('filtra Fecha de emisión por días locales inclusivos antes de paginar y conserva ownership', async () => {
    const [ownerInvoice, adminInvoice, receptionInvoice, barberInvoice] =
      await Promise.all(
        [
          completedOwner.id,
          completedAdmin.id,
          completedReception.id,
          completedBarberA.id,
        ].map((bookingId) =>
          prisma.db.invoice.findUniqueOrThrow({ where: { bookingId } }),
        ),
      );
    const tenantBInvoice = await prisma.db.invoice.findUniqueOrThrow({
      where: { bookingId: completedBarberB.id },
    });
    await Promise.all([
      prisma.db.invoice.update({
        where: { id: ownerInvoice.id },
        data: { createdAt: new Date('2026-08-10T04:00:00.000Z') },
      }),
      prisma.db.invoice.update({
        where: { id: adminInvoice.id },
        data: { createdAt: new Date('2026-08-11T03:59:59.999Z') },
      }),
      prisma.db.invoice.update({
        where: { id: receptionInvoice.id },
        data: { createdAt: new Date('2026-08-11T04:00:00.000Z') },
      }),
      prisma.db.invoice.update({
        where: { id: barberInvoice.id },
        data: { createdAt: new Date('2026-08-10T16:00:00.000Z') },
      }),
      prisma.db.invoice.update({
        where: { id: tenantBInvoice.id },
        data: { createdAt: new Date('2026-08-10T16:00:00.000Z') },
      }),
    ]);

    const ownerPaid = await requestApp(app)
      .get('/invoices?from=2026-08-10&to=2026-08-10&state=PAID&page=1&limit=1')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerPaid.status).toBe(200);
    expect(ownerPaid.headers['x-total-count']).toBe('2');
    expect(asArray(ownerPaid.body as unknown)).toHaveLength(1);
    expect(asRecord(asArray(ownerPaid.body as unknown)[0]).id).toBe(
      adminInvoice.id,
    );

    const barberOwn = await requestApp(app)
      .get('/invoices?from=2026-08-10&to=2026-08-10')
      .set('Authorization', `Bearer ${barberAToken}`);
    expect(barberOwn.status).toBe(200);
    expect(barberOwn.headers['x-total-count']).toBe('1');
    expect(asRecord(asArray(barberOwn.body as unknown)[0]).id).toBe(
      barberInvoice.id,
    );

    const beforeRange = await requestApp(app)
      .get('/invoices?to=2026-08-09')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(beforeRange.status).toBe(200);
    expect(beforeRange.headers['x-total-count']).toBe('0');

    const openFrom = await requestApp(app)
      .get('/invoices?from=2026-08-11&limit=100')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(openFrom.status).toBe(200);
    expect(
      asArray(openFrom.body as unknown).map((item) => asRecord(item).id),
    ).toContain(receptionInvoice.id);

    for (const query of ['from=2026-08-11&to=2026-08-10', 'from=2026-02-30']) {
      const invalid = await requestApp(app)
        .get(`/invoices?${query}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(invalid.status).toBe(400);
    }
  });

  it('la emisión es idempotente y solo audita una vez', async () => {
    const first = await requestApp(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${barberAToken}`)
      .send({ bookingId: completedBarberA.id });
    expect(first.status).toBe(200);
    const invoiceId = asRecord(first.body as unknown).id;
    if (typeof invoiceId !== 'string') {
      throw new Error('Invoice response did not include id');
    }
    expect(
      await prisma.db.auditLog.count({
        where: {
          organizationId: tenantA.id,
          action: 'ISSUE_INVOICE',
          entity: 'Invoice',
          entityId: invoiceId,
        },
      }),
    ).toBe(1);
  });

  it('registra un Payment completo e idempotente sin alterar actor ni paidAt', async () => {
    const invoice = await prisma.db.invoice.findUniqueOrThrow({
      where: { bookingId: completedBarberA.id },
    });
    const first = await requestApp(app)
      .post(`/invoices/${invoice.id}/payments`)
      .set('Authorization', `Bearer ${barberAToken}`)
      .send({ method: PaymentMethod.CARD });
    const repeated = await requestApp(app)
      .post(`/invoices/${invoice.id}/payments`)
      .set('Authorization', `Bearer ${barberAToken}`)
      .send({ method: PaymentMethod.CARD });
    const conflict = await requestApp(app)
      .post(`/invoices/${invoice.id}/payments`)
      .set('Authorization', `Bearer ${barberAToken}`)
      .send({ method: PaymentMethod.CASH });

    expect(first.status).toBe(201);
    expect(repeated.status).toBe(200);
    expect(conflict.status).toBe(409);
    expect(asRecord(repeated.body as unknown).payment).toEqual(
      asRecord(first.body as unknown).payment,
    );
    const payment = await prisma.db.payment.findUniqueOrThrow({
      where: { invoiceId: invoice.id },
    });
    expect(payment.recordedByUserId).toBe(barberA.id);
    expect(payment.method).toBe(PaymentMethod.CARD);
    expect(
      await prisma.db.auditLog.count({
        where: {
          action: 'RECORD_INVOICE_PAYMENT',
          entity: 'Payment',
          entityId: payment.id,
        },
      }),
    ).toBe(1);
  });

  it('pagina después del ownership y devuelve una proyección mínima', async () => {
    const response = await requestApp(app)
      .get('/invoices?page=1&limit=1&state=PAID')
      .set('Authorization', `Bearer ${barberAToken}`);
    expect(response.status).toBe(200);
    expect(response.headers['x-total-count']).toBe('1');
    expect(response.headers['x-page']).toBe('1');
    expect(response.headers['x-limit']).toBe('1');
    const body = asArray(response.body as unknown);
    expect(body).toHaveLength(1);
    expect(Object.keys(asRecord(body[0])).sort()).toEqual(
      [
        'amount',
        'booking',
        'currency',
        'id',
        'issuedAt',
        'payment',
        'state',
      ].sort(),
    );
    expect(JSON.stringify(body)).not.toContain('@client.test');
    expect(JSON.stringify(body)).not.toContain('+18095550000');
    expect(JSON.stringify(body)).not.toContain('Nota privada');
    expect(JSON.stringify(body)).not.toContain('recordedByUserId');
    expect(JSON.stringify(body)).not.toContain('organizationId');
  });

  it('BARBER sin vínculo obtiene lista vacía y no puede operar recursos', async () => {
    const list = await requestApp(app)
      .get('/invoices')
      .set('Authorization', `Bearer ${unlinkedToken}`);
    expect(list.status).toBe(200);
    expect(list.body).toEqual([]);
    expect(list.headers['x-total-count']).toBe('0');

    const invoice = await prisma.db.invoice.findUniqueOrThrow({
      where: { bookingId: completedOwner.id },
    });
    const detail = await requestApp(app)
      .get(`/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${unlinkedToken}`);
    expect(detail.status).toBe(404);
    await requestApp(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${unlinkedToken}`)
      .send({ bookingId: completedOwner.id })
      .expect(404);
    await requestApp(app)
      .post(`/invoices/${invoice.id}/payments`)
      .set('Authorization', `Bearer ${unlinkedToken}`)
      .send({ method: PaymentMethod.CASH })
      .expect(404);
  });

  it('CUSTOMER no accede a Facturación ni Analytics', async () => {
    await requestApp(app)
      .get('/invoices')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
    await requestApp(app)
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('serializa ráfagas de emisión y cobro en un solo agregado y AuditLog', async () => {
    const professional = await createProfessional(tenantA, 'race');
    const booking = await createBooking(
      tenantA,
      professional.id,
      BookingStatus.COMPLETED,
      600,
    );
    const issue = () =>
      requestApp(app)
        .post('/invoices')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ bookingId: booking.id });
    const issued = await Promise.all([issue(), issue()]);
    expect(issued.map(({ status }) => status).sort()).toEqual([200, 201]);
    const invoice = await prisma.db.invoice.findUniqueOrThrow({
      where: { bookingId: booking.id },
    });
    expect(
      await prisma.db.auditLog.count({
        where: { action: 'ISSUE_INVOICE', entityId: invoice.id },
      }),
    ).toBe(1);

    const pay = () =>
      requestApp(app)
        .post(`/invoices/${invoice.id}/payments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ method: PaymentMethod.TRANSFER });
    const paid = await Promise.all([pay(), pay()]);
    expect(paid.map(({ status }) => status).sort()).toEqual([200, 201]);
    const payment = await prisma.db.payment.findUniqueOrThrow({
      where: { invoiceId: invoice.id },
    });
    expect(
      await prisma.db.auditLog.count({
        where: { action: 'RECORD_INVOICE_PAYMENT', entityId: payment.id },
      }),
    ).toBe(1);
  });

  it('PostgreSQL impide relaciones financieras cruzadas entre tenants', async () => {
    const professional = await createProfessional(tenantA, 'cross-tenant');
    const bookingWithoutInvoice = await createBooking(
      tenantA,
      professional.id,
      BookingStatus.COMPLETED,
      1_500,
    );
    await expect(
      prisma.db.invoice.create({
        data: {
          organizationId: tenantB.id,
          bookingId: bookingWithoutInvoice.id,
          amount: '125.50',
          currency: 'DOP',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });

    await expect(
      prisma.db.payment.create({
        data: {
          organizationId: tenantB.id,
          invoiceId: privilegedFieldsInvoiceId,
          method: PaymentMethod.CASH,
          paidAt: new Date(),
          recordedByUserId: barberB.id,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('Analytics atribuye ingresos al día de Payment.paidAt', async () => {
    const beforeResponse = await requestApp(app)
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(beforeResponse.status).toBe(200);
    const beforeRevenue = Number(
      asRecord(asRecord(beforeResponse.body as unknown).revenue).today,
    );

    const professional = await createProfessional(tenantA, 'analytics');
    const paidTodayBooking = await createBooking(
      tenantA,
      professional.id,
      BookingStatus.COMPLETED,
      1_200,
    );
    const paidTodayInvoice = await prisma.db.invoice.create({
      data: {
        organizationId: tenantA.id,
        bookingId: paidTodayBooking.id,
        amount: '125.50',
        currency: 'DOP',
        createdAt: new Date('2000-01-01T00:00:00.000Z'),
      },
    });
    await prisma.db.payment.create({
      data: {
        organizationId: tenantA.id,
        invoiceId: paidTodayInvoice.id,
        method: PaymentMethod.CASH,
        paidAt: new Date(),
        recordedByUserId: owner.id,
      },
    });
    const afterToday = await requestApp(app)
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${ownerToken}`);
    const afterTodayRevenue = Number(
      asRecord(asRecord(afterToday.body as unknown).revenue).today,
    );
    expect(afterTodayRevenue).toBeCloseTo(beforeRevenue + 125.5);

    const paidLongAgoBooking = await createBooking(
      tenantA,
      professional.id,
      BookingStatus.COMPLETED,
      1_260,
    );
    const paidLongAgoInvoice = await prisma.db.invoice.create({
      data: {
        organizationId: tenantA.id,
        bookingId: paidLongAgoBooking.id,
        amount: '125.50',
        currency: 'DOP',
        createdAt: new Date(),
      },
    });
    await prisma.db.payment.create({
      data: {
        organizationId: tenantA.id,
        invoiceId: paidLongAgoInvoice.id,
        method: PaymentMethod.CASH,
        paidAt: new Date('2000-01-01T00:00:00.000Z'),
        recordedByUserId: owner.id,
      },
    });
    const afterOldPayment = await requestApp(app)
      .get('/analytics/dashboard')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(
      Number(asRecord(asRecord(afterOldPayment.body as unknown).revenue).today),
    ).toBeCloseTo(afterTodayRevenue);
  });

  it('un mismo User con rol distinto no puede inferir Facturación del otro tenant', async () => {
    const ownerAsBarberB = await tokenFor(owner, tenantB.id, UserRole.BARBER);
    const invoiceA = await prisma.db.invoice.findUniqueOrThrow({
      where: { bookingId: completedOwner.id },
    });
    const response = await requestApp(app)
      .get(`/invoices/${invoiceA.id}`)
      .set('Authorization', `Bearer ${ownerAsBarberB}`);
    expect(response.status).toBe(404);
  });
});

describe('Facturación-A audit rollback (e2e PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let bookingId: string;
  let invoiceId: string;

  beforeAll(async () => {
    app = await createE2eApp((builder) =>
      builder.overrideProvider(AuditService).useValue({
        log: jest.fn().mockResolvedValue(undefined),
        logTransactional: jest
          .fn()
          .mockRejectedValue(new Error('forced audit failure')),
      }),
    );
    prisma = app.get(PrismaService);
    const jwt = app.get(JwtService);
    const suffix = `rollback-${Date.now()}`;
    const organization = await prisma.db.organization.create({
      data: {
        name: 'Rollback tenant',
        slug: suffix,
        email: `${suffix}@organization.test`,
      },
    });
    const user = await prisma.db.user.create({
      data: {
        name: 'Rollback owner',
        email: `${suffix}@identity.test`,
        password: null,
      },
    });
    await prisma.db.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: UserRole.OWNER,
      },
    });
    const [client, service, professional] = await Promise.all([
      prisma.db.client.create({
        data: { organizationId: organization.id, name: 'Rollback client' },
      }),
      prisma.db.service.create({
        data: {
          organizationId: organization.id,
          name: 'Rollback service',
          duration: 30,
          price: '50.00',
        },
      }),
      prisma.db.professional.create({
        data: {
          organizationId: organization.id,
          name: 'Rollback professional',
          status: 'ACTIVE',
        },
      }),
    ]);
    const booking = await prisma.db.booking.create({
      data: {
        organizationId: organization.id,
        clientId: client.id,
        serviceId: service.id,
        professionalId: professional.id,
        startTime: new Date('2026-08-20T18:00:00.000Z'),
        endTime: new Date('2026-08-20T18:30:00.000Z'),
        status: BookingStatus.COMPLETED,
      },
    });
    bookingId = booking.id;
    const paymentBooking = await prisma.db.booking.create({
      data: {
        organizationId: organization.id,
        clientId: client.id,
        serviceId: service.id,
        professionalId: professional.id,
        startTime: new Date('2026-08-20T19:00:00.000Z'),
        endTime: new Date('2026-08-20T19:30:00.000Z'),
        status: BookingStatus.COMPLETED,
      },
    });
    const invoice = await prisma.db.invoice.create({
      data: {
        organizationId: organization.id,
        bookingId: paymentBooking.id,
        amount: '50.00',
        currency: 'DOP',
      },
    });
    invoiceId = invoice.id;
    token = await jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: UserRole.OWNER,
      organizationId: organization.id,
    });
  });

  afterAll(async () => app.close());

  it('revierte Invoice si falla AuditLog transaccional', async () => {
    const response = await requestApp(app)
      .post('/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId });
    expect(response.status).toBe(500);
    expect(await prisma.db.invoice.count({ where: { bookingId } })).toBe(0);
  });

  it('revierte Payment si falla AuditLog transaccional', async () => {
    const response = await requestApp(app)
      .post(`/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ method: PaymentMethod.CASH });
    expect(response.status).toBe(500);
    expect(await prisma.db.payment.count({ where: { invoiceId } })).toBe(0);
  });
});
