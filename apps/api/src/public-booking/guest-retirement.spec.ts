import type { Server } from 'node:http';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { BookingStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { AuditService } from '../audit/audit.service';
import { ClerkSessionVerifierService } from '../auth/clerk/clerk-session-verifier.service';
import { MediaPurgeWorker } from '../media/media-purge.worker';
import { globalValidationPipeOptions } from '../common/validation.config';

// Aplicación real y HTTP real; persistencia/proveedor controlados, sin base ni Clerk vivos.
describe('Retiro B2C C1 — HTTP de AppModule', () => {
  let app: INestApplication;
  const orgId = '00000000-0000-4000-8000-000000000001';
  const id = '00000000-0000-4000-8000-000000000002';
  const dto = {
    serviceId: id,
    professionalId: id,
    startTime: '2099-01-01T10:00:00.000Z',
    clientName: 'Invitado sintético',
    clientPhone: '+18095550100',
  };
  const organization = {
    id: orgId,
    isActive: true,
    deletedAt: null,
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
    cmsPage: { isPublished: true, publishedSnapshot: { publicName: 'Demo' } },
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: orgId }]),
    organization: { findUnique: jest.fn().mockResolvedValue(organization) },
    client: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id }),
    },
    user: { create: jest.fn() },
    membership: { create: jest.fn() },
  };
  const db = {
    organization: { findUnique: jest.fn().mockResolvedValue(organization) },
    user: { findFirst: jest.fn(), create: jest.fn() },
    membership: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const verify = jest.fn().mockRejectedValue(new UnauthorizedException());
  const create = jest.fn().mockResolvedValue({
    id,
    serviceId: id,
    professionalId: id,
    startTime: new Date(dto.startTime),
    endTime: new Date('2099-01-01T10:30:00.000Z'),
    status: BookingStatus.PENDING,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ db })
      .overrideProvider(BookingsService)
      .useValue({ create })
      .overrideProvider(AuditService)
      .useValue({ log: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(ClerkSessionVerifierService)
      .useValue({ verify })
      .overrideProvider(MediaPurgeWorker)
      .useValue({})
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(globalValidationPipeOptions));
    await app.init();
  });
  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => {
    if (app) await app.close();
  });

  it.each([
    ['get', '/customer/businesses'],
    ['get', '/customer/demo/bookings'],
    ['get', `/customer/demo/bookings/${id}`],
    ['get', '/customer/demo/profile'],
    ['patch', '/customer/demo/profile'],
    ['post', '/customer/demo/bookings'],
    ['post', '/auth/clerk/customer/claims'],
  ] as const)(
    '%s %s queda inexistente con y sin bearer',
    async (method, path) => {
      for (const bearer of [null, 'synthetic-session']) {
        const req = request(app.getHttpServer() as Server)[method](path);
        if (bearer) req.set('Authorization', `Bearer ${bearer}`);
        await req.send({}).expect(404);
      }
      expect(verify).not.toHaveBeenCalled();
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );

  it.each([
    { createAccount: true },
    { createAccount: false },
    { password: 'Synthetic-password-123!' },
    { createAccount: true, password: 'Synthetic-password-123!' },
  ])('rechaza campos de cuenta antes de persistir: %j', async (extra) => {
    await request(app.getHttpServer() as Server)
      .post('/public/demo/bookings')
      .send({ ...dto, ...extra })
      .expect(400);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(tx.client.create).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it.each([null, 'internal-synthetic-session'])(
    'reserva invitada sin correo, independientemente del bearer %s',
    async (bearer) => {
      const req = request(app.getHttpServer() as Server).post(
        '/public/demo/bookings',
      );
      if (bearer) req.set('Authorization', `Bearer ${bearer}`);
      const response = await req.send(dto).expect(201);
      expect(response.body).toEqual({
        booking: {
          id,
          serviceId: id,
          professionalId: id,
          startTime: dto.startTime,
          endTime: '2099-01-01T10:30:00.000Z',
          status: 'PENDING',
        },
      });
      expect(response.body).not.toHaveProperty('accountCreated');
      expect(response.body).not.toHaveProperty('accountCreationError');
      expect(tx.client.create).toHaveBeenCalledWith({
        data: {
          organizationId: orgId,
          name: dto.clientName,
          phone: dto.clientPhone,
          email: null,
        },
        select: { id: true },
      });
      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.user.create).not.toHaveBeenCalled();
      expect(tx.membership.create).not.toHaveBeenCalled();
      expect(db.user.create).not.toHaveBeenCalled();
      expect(db.user.findFirst).not.toHaveBeenCalled();
      expect(verify).not.toHaveBeenCalled();
    },
  );

  it.each([
    '/invoices',
    '/analytics/dashboard',
    '/analytics/summary',
    '/services',
  ])('rechaza JWT CUSTOMER previo con 401 en %s', async (path) => {
    db.membership.findUnique.mockResolvedValue({
      organizationId: orgId,
      role: 'CUSTOMER',
    });
    const token = await app
      .get(JwtService)
      .signAsync({ sub: id, organizationId: orgId, role: 'OWNER' });
    await request(app.getHttpServer() as Server)
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(db.membership.findUnique).toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['get', '/auth/clerk/me'],
    ['post', '/auth/clerk/onboarding'],
    ['get', '/clients'],
    ['get', '/bookings'],
    ['get', '/professionals'],
  ] as const)('conserva ruta interna protegida %s %s', async (method, path) => {
    await request(app.getHttpServer() as Server)
      [method](path)
      .send({})
      .expect(401);
  });
});
