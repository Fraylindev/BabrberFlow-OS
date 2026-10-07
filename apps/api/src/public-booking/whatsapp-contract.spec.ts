import type { Server } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { BookingStatus } from '@prisma/client';
import request from 'supertest';
import { AuditService } from '../audit/audit.service';
import { BookingsService } from '../bookings/bookings.service';
import { globalValidationPipeOptions } from '../common/validation.config';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionalAvailabilityService } from '../professionals/professional-availability.service';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';

// Contrato HTTP real; dobles de persistencia, sin conectar bases ni WhatsApp.
function organization(slug: string, phone: string | null) {
  return {
    id: `private-tenant-${slug}`,
    slug,
    isActive: true,
    deletedAt: null as Date | null,
    timeZone: 'America/Santo_Domingo',
    businessHours: null,
    businessSchedule: {
      state: 'LEGACY_UNCONFIRMED',
      zoneConfirmed: false,
      legacyPublicAllowed: true,
      days: [],
      closures: [],
      revision: 0,
    },
    name: 'Nombre operativo privado',
    phone: '+18095559999',
    email: 'private@example.test',
    cmsPage: {
      isPublished: true,
      draft: { publicName: 'Borrador privado', phone: '+18095558888' },
      publishedSnapshot: {
        publicName: `Publicado ${slug}`,
        phone,
        description: null,
        address: null,
        googleMapsUrl: null,
      },
    },
  };
}

const booking = {
  id: '00000000-0000-4000-8000-000000000001',
  serviceId: '00000000-0000-4000-8000-000000000002',
  professionalId: '00000000-0000-4000-8000-000000000003',
  startTime: new Date('2099-01-05T13:00:00.000Z'),
  endTime: new Date('2099-01-05T13:30:00.000Z'),
  status: BookingStatus.PENDING,
  clientId: 'private-client',
  organizationId: 'private-tenant-a',
  notes: 'Nota privada',
};
const input = {
  serviceId: booking.serviceId,
  professionalId: booking.professionalId,
  startTime: booking.startTime.toISOString(),
  clientName: 'Visitante de prueba',
  clientPhone: '+18095550000',
};

describe('WhatsApp C1 - existing public HTTP contract', () => {
  let app: INestApplication;
  let organizations: Map<string, ReturnType<typeof organization>>;
  const findUnique = jest.fn();
  const findServices = jest.fn();
  const findProfessionals = jest.fn();
  const createBooking = jest.fn();
  const audit = { log: jest.fn() };
  const transaction = {
    $queryRaw: jest.fn(),
    organization: { findUnique },
    client: { findFirst: jest.fn() },
  };
  const transact = jest.fn();
  const previousClosed = process.env.PUBLIC_BOOKING_CLOSED;
  const previousBase = process.env.WHATSAPP_BASE_URL;

  beforeEach(async () => {
    jest.resetAllMocks();
    delete process.env.PUBLIC_BOOKING_CLOSED;
    delete process.env.WHATSAPP_BASE_URL;
    organizations = new Map([
      ['a', organization('a', '+18095551111')],
      ['b', organization('b', '+34912345678')],
    ]);
    findUnique.mockImplementation(({ where }: { where: { slug: string } }) =>
      Promise.resolve(organizations.get(where.slug) ?? null),
    );
    findServices.mockResolvedValue([]);
    findProfessionals.mockResolvedValue([]);
    transaction.$queryRaw.mockResolvedValue([]);
    transaction.client.findFirst.mockResolvedValue({
      id: booking.clientId,
      isActive: true,
    });
    transact.mockImplementation(
      (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );
    createBooking.mockResolvedValue(booking);
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
      controllers: [PublicBookingController],
      providers: [
        PublicBookingService,
        {
          provide: PrismaService,
          useValue: {
            db: {
              organization: { findUnique },
              service: { findMany: findServices },
              professional: { findMany: findProfessionals },
              $transaction: transact,
            },
          },
        },
        { provide: BookingsService, useValue: { create: createBooking } },
        { provide: AuditService, useValue: audit },
        { provide: ProfessionalAvailabilityService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(globalValidationPipeOptions));
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    if (previousClosed === undefined) delete process.env.PUBLIC_BOOKING_CLOSED;
    else process.env.PUBLIC_BOOKING_CLOSED = previousClosed;
    if (previousBase === undefined) delete process.env.WHATSAPP_BASE_URL;
    else process.env.WHATSAPP_BASE_URL = previousBase;
  });

  function http() {
    return request(app.getHttpServer() as Server);
  }

  it('returns the published allowlist with the authorized technical zone', async () => {
    const response = await http().get('/public/a/booking-data').expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const { minimumBookingDate } = response.body as {
      minimumBookingDate: string;
    };
    expect(minimumBookingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(response.body).toEqual({
      minimumBookingDate,
      timeZone: 'America/Santo_Domingo',
      organization: {
        name: 'Publicado a',
        slug: 'a',
        phone: '+18095551111',
        description: null,
        address: null,
        googleMapsUrl: null,
      },
      whatsappBaseUrl: 'https://wa.me/',
      services: [],
      professionals: [],
    });
    expect(transact).not.toHaveBeenCalled();
    expect(createBooking).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('isolates A → B → A by slug, ignoring supplied tenant, phone and message', async () => {
    organizations.get('b')!.timeZone = 'Europe/Madrid';
    for (const slug of ['a', 'b', 'a']) {
      const response = await http()
        .get(`/public/${slug}/booking-data`)
        .set('x-organization-id', 'private-tenant-other')
        .query({
          organizationId: 'other',
          timeZone: 'UTC',
          phone: '+19999999999',
          text: 'private',
        })
        .expect(200);
      expect(response.body).toMatchObject({
        timeZone: organizations.get(slug)!.timeZone,
        organization: {
          slug,
          phone: organizations.get(slug)!.cmsPage.publishedSnapshot.phone,
        },
      });
      expect(findUnique).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { slug } }),
      );
      expect(findServices).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { organizationId: `private-tenant-${slug}`, isActive: true },
        }),
      );
      expect(findProfessionals).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: {
            organizationId: `private-tenant-${slug}`,
            status: 'ACTIVE',
            isPublic: true,
          },
        }),
      );
    }
  });

  it.each([null, '', '8095551234', '0018095551234', '+1 (809) 555-1234'])(
    'preserves published contact %j without inferring country or using private fallback',
    async (phone) => {
      organizations.set('a', organization('a', phone));
      const response = await http().get('/public/a/booking-data').expect(200);
      expect(response.body).toMatchObject({ organization: { phone } });
      expect(JSON.stringify(response.body)).not.toMatch(
        /18095559999|18095558888/,
      );
    },
  );

  it.each(['https://legacy.example.test/', 'javascript:legacy', ''])(
    'preserves the legacy base %j without generating an action or message',
    async (base) => {
      process.env.WHATSAPP_BASE_URL = base;
      const response = await http().get('/public/a/booking-data').expect(200);
      expect(response.body).toMatchObject({
        whatsappBaseUrl: base || 'https://wa.me/',
      });
      expect(response.body).not.toHaveProperty('whatsappAction');
      expect(response.body).not.toHaveProperty('message');
    },
  );

  it.each([
    'missing',
    'inactive',
    'deleted',
    'withdrawn',
    'snapshot',
    'closed',
  ])('returns the same neutral 404 without contact when %s', async (state) => {
    const tenant = organizations.get('a')!;
    if (state === 'missing') organizations.delete('a');
    if (state === 'inactive') tenant.isActive = false;
    if (state === 'deleted') tenant.deletedAt = new Date();
    if (state === 'withdrawn') tenant.cmsPage.isPublished = false;
    if (state === 'snapshot') {
      findUnique.mockResolvedValue({
        ...tenant,
        cmsPage: { isPublished: true, publishedSnapshot: null },
      });
    }
    if (state === 'closed') process.env.PUBLIC_BOOKING_CLOSED = 'true';
    const response = await http().get('/public/a/booking-data').expect(404);
    expect(response.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Información no disponible.',
    });
    expect(findServices).not.toHaveBeenCalled();
    expect(findProfessionals).not.toHaveBeenCalled();
  });

  it('rechecks publication on the next request and never falls back to a draft', async () => {
    await http().get('/public/a/booking-data').expect(200);
    organizations.get('a')!.cmsPage.isPublished = false;
    await http().get('/public/a/booking-data').expect(404);
  });

  it('returns a safe 503 without catalog or zone when the stored zone is invalid', async () => {
    organizations.get('a')!.timeZone = 'Private/Invalid_Zone';
    const response = await http().get('/public/a/booking-data').expect(503);
    expect(response.body).toEqual({
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'No fue posible calcular la fecha del negocio.',
    });
    expect(findServices).not.toHaveBeenCalled();
    expect(findProfessionals).not.toHaveBeenCalled();
  });

  it('returns a safe 503 for malformed published content', async () => {
    findUnique.mockResolvedValue({
      ...organizations.get('a'),
      cmsPage: { isPublished: true, publishedSnapshot: { phone: 123 } },
    });
    const response = await http().get('/public/a/booking-data').expect(503);
    expect(response.body).toEqual({
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'La información pública no está disponible. Intenta de nuevo.',
    });
  });

  it('preserves PENDING in the public creation response without messaging fields or PII', async () => {
    const response = await http()
      .post('/public/a/bookings')
      .send(input)
      .expect(201);
    expect(response.body).toEqual({
      booking: {
        id: booking.id,
        serviceId: booking.serviceId,
        professionalId: booking.professionalId,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        status: 'PENDING',
      },
    });
    expect(createBooking).toHaveBeenCalledTimes(1);
    expect(createBooking).toHaveBeenCalledWith(
      'private-tenant-a',
      {
        serviceId: input.serviceId,
        professionalId: input.professionalId,
        clientId: booking.clientId,
        startTime: input.startTime,
      },
      transaction,
      true,
    );
    await http().get('/public/a/booking-data').expect(200);
    expect(createBooking).toHaveBeenCalledTimes(1);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it.each(['organizationId', 'status', 'whatsappBaseUrl', 'message'])(
    'rejects an extra %s in creation before any write',
    async (field) => {
      await http()
        .post('/public/a/bookings')
        .send({ ...input, [field]: 'untrusted' })
        .expect(400);
      expect(transact).not.toHaveBeenCalled();
      expect(createBooking).not.toHaveBeenCalled();
    },
  );
});
