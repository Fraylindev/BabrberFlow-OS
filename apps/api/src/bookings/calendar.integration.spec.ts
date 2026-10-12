import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { PrismaClient, Prisma, UserRole } from '@prisma/client';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ProfessionalAvailabilityService } from '../professionals/professional-availability.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { PublicBookingService } from '../public-booking/public-booking.service';
import { BusinessScheduleService } from '../business-schedule/business-schedule.service';
import { BookingsService } from './bookings.service';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { CalendarBudgetGuard } from './calendar-budget.guard';
import { B2bAuthGuard } from '../auth/guards/b2b-auth.guard';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { globalValidationPipeOptions } from '../common/validation.config';
import type { RequestUser } from '../auth/types/authenticated-request';
const run =
  process.env.RUN_POSTGRES_INTEGRATION === '1' ? describe : describe.skip;
run('M3 real disposable PostgreSQL', () => {
  const db = new PrismaClient();
  const runtime = new PrismaClient({
    datasources: {
      db: {
        url: process.env.C1_RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL,
      },
    },
  });
  const holder = { db: runtime } as unknown as PrismaService;
  const audit = new AuditService(holder),
    availability = new ProfessionalAvailabilityService(holder, audit);
  const legacy = new BookingsService(holder, availability),
    calendar = new CalendarService(holder, availability);
  const publicBooking = new PublicBookingService(
    holder,
    legacy,
    audit,
    availability,
  );
  const professionals = new ProfessionalsService(holder, audit),
    schedule = new BusinessScheduleService(holder, audit);
  let app: INestApplication;
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  beforeAll(async () => {
    if (new URL(process.env.DATABASE_URL ?? '').hostname !== '127.0.0.1')
      throw new Error('Disposable loopback cluster required');
    delete process.env.PUBLIC_BOOKING_CLOSED;
    const module = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [
        CalendarBudgetGuard,
        Reflector,
        RolesGuard,
        B2bAuthGuard,
        { provide: CalendarService, useValue: calendar },
        { provide: PrismaService, useValue: holder },
        { provide: JwtService, useValue: jwt },
        {
          provide: ClerkAuthGuard,
          useValue: {
            canActivate: () => {
              throw new UnauthorizedException();
            },
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use(
      (
        _req: unknown,
        res: { setHeader: (key: string, value: string) => void },
        next: () => void,
      ) => {
        res.setHeader('Cache-Control', 'no-store');
        next();
      },
    );
    app.useGlobalPipes(new ValidationPipe(globalValidationPipeOptions));
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => {
    await app?.close();
    await runtime.$disconnect();
    await db.$disconnect();
  });
  async function fixture(past = false, zone = 'America/Santo_Domingo') {
    const org = await db.organization.create({
      data: {
        name: 'Synthetic M3',
        slug: randomUUID(),
        email: randomUUID() + '@test.invalid',
        timeZone: zone,
        businessSchedule: {
          create: {
            state: 'CONFIRMED',
            zoneConfirmed: true,
            days: {
              create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
                dayOfWeek,
                windows: { create: [{ startMinute: 540, endMinute: 1140 }] },
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
        publishedRevision: 0,
        publishedSnapshot: {
          publicName: 'Synthetic M3',
          phone: null,
          description: null,
          address: null,
          googleMapsUrl: null,
        },
      },
    });
    const owner = await db.user.create({
      data: {
        name: 'Synthetic operator',
        email: randomUUID() + '@test.invalid',
        memberships: { create: { organizationId: org.id, role: 'OWNER' } },
      },
    });
    const professional = await db.professional.create({
      data: {
        organizationId: org.id,
        name: 'Synthetic professional',
        status: 'ACTIVE',
        isPublic: true,
      },
    });
    const service = await db.service.create({
      data: {
        organizationId: org.id,
        name: 'Synthetic service',
        duration: 30,
        price: 1,
      },
    });
    const client = await db.client.create({
      data: {
        organizationId: org.id,
        name: 'Synthetic client',
        email: randomUUID() + '@test.invalid',
        phone: '+18095550123',
      },
    });
    const startTime = new Date(
      past ? '2020-01-01T13:10:00Z' : '2099-01-01T13:10:00Z',
    );
    const booking = await db.booking.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        professionalId: professional.id,
        serviceId: service.id,
        startTime,
        endTime: new Date(startTime.getTime() + 1800000),
      },
    });
    const user: RequestUser = {
      ...owner,
      organizationId: org.id,
      role: UserRole.OWNER,
    };
    return { org, owner, professional, service, client, booking, user };
  }
  async function command(
    f: Awaited<ReturnType<typeof fixture>>,
    start = '2099-01-02T14:00:00.000Z',
  ) {
    const detail = await calendar.detail(f.user, f.booking.id);
    return {
      startTime: start,
      expectedUpdatedAt: detail.updatedAt.toISOString(),
      expectedRevision: detail.revision,
    };
  }
  async function events(id: string) {
    return db.bookingEmailEvent.count({ where: { bookingId: id } });
  }
  async function originIntact(f: Awaited<ReturnType<typeof fixture>>) {
    const row = await db.booking.findUniqueOrThrow({
      where: { id: f.booking.id },
    });
    expect(row.startTime).toEqual(f.booking.startTime);
    expect(row.endTime).toEqual(f.booking.endTime);
  }
  const token = (user: RequestUser) =>
    jwt.sign({
      sub: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: 'OWNER',
    });
  it('uniform 404, minimum projection, public self-occupation and B2B private professional', async () => {
    const a = await fixture(),
      b = await fixture();
    for (const id of [b.booking.id, randomUUID()])
      await request(app.getHttpServer() as Server)
        .get('/bookings/' + id)
        .set('Authorization', 'Bearer ' + token(a.user))
        .expect(404)
        .expect('Cache-Control', 'no-store');
    const detail = await calendar.detail(a.user, a.booking.id);
    expect(Object.keys(detail).sort()).toEqual(
      [
        'id',
        'startTime',
        'endTime',
        'status',
        'updatedAt',
        'revision',
        'client',
        'professional',
        'service',
      ].sort(),
    );
    expect(detail.client).toEqual({ name: 'Synthetic client' });
    const internal = await calendar.availabilityForDate(
      a.user,
      a.booking.id,
      '2099-01-01',
    );
    expect(
      internal.slots.some((s) => s.startTime === '2099-01-01T13:10:00.000Z'),
    ).toBe(true);
    const external = await publicBooking.getAvailability(a.org.slug, {
      date: '2099-01-01',
      serviceId: a.service.id,
      professionalId: a.professional.id,
    });
    expect(
      external.slots.some((s) => s.startTime === '2099-01-01T13:10:00.000Z'),
    ).toBe(false);
    expect(
      external.slots.some((s) => s.startTime === '2099-01-01T13:30:00.000Z'),
    ).toBe(false);
    expect(
      external.slots.every((s) =>
        ['00', '30'].includes(s.startTime.slice(14, 16)),
      ),
    ).toBe(true);
    await db.professional.update({
      where: { id: a.professional.id },
      data: { isPublic: false },
    });
    await db.cmsPage.update({
      where: { organizationId: a.org.id },
      data: { isPublished: false },
    });
    expect(
      (await calendar.availabilityForDate(a.user, a.booking.id, '2099-01-02'))
        .slots.length,
    ).toBeGreaterThan(0);
    await expect(
      publicBooking.getAvailability(a.org.slug, {
        date: '2099-01-02',
        serviceId: a.service.id,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
  it.each(['OWNER', 'ADMIN', 'RECEPTIONIST'] as const)(
    '%s may read and reschedule, retains state/client and exactly one event',
    async (role) => {
      const f = await fixture();
      await db.membership.update({
        where: {
          userId_organizationId: {
            userId: f.user.id,
            organizationId: f.org.id,
          },
        },
        data: { role },
      });
      await request(app.getHttpServer() as Server)
        .get('/bookings/calendar')
        .query({ from: '2099-01-01', to: '2099-01-02' })
        .set('Authorization', 'Bearer ' + token(f.user))
        .expect(200);
      const dto = await command(f);
      const result = await request(app.getHttpServer() as Server)
        .patch('/bookings/' + f.booking.id + '/reschedule')
        .set('Authorization', 'Bearer ' + token(f.user))
        .send(dto)
        .expect(200)
        .expect('Cache-Control', 'no-store');
      expect((result.body as { status: string }).status).toBe('PENDING');
      expect((result.body as { professionalId: string }).professionalId).toBe(
        f.professional.id,
      );
      expect((result.body as { serviceId: string }).serviceId).toBe(
        f.service.id,
      );
      expect(await events(f.booking.id)).toBe(1);
      expect(
        (await db.booking.findUniqueOrThrow({ where: { id: f.booking.id } }))
          .clientId,
      ).toBe(f.client.id);
      await request(app.getHttpServer() as Server)
        .patch('/bookings/' + f.booking.id + '/reschedule')
        .set('Authorization', 'Bearer ' + token(f.user))
        .send(dto)
        .expect(409);
      expect(await events(f.booking.id)).toBe(1);
    },
  );
  it('BARBER only own / no link empty, denied mutation/availability, session role change and revocation', async () => {
    const f = await fixture();
    const auth = token(f.user);
    await db.membership.update({
      where: {
        userId_organizationId: { userId: f.user.id, organizationId: f.org.id },
      },
      data: { role: 'BARBER' },
    });
    let response = await request(app.getHttpServer() as Server)
      .get('/bookings/calendar')
      .query({ from: '2099-01-01', to: '2099-01-02' })
      .set('Authorization', 'Bearer ' + auth)
      .expect(200);
    expect((response.body as { items: unknown[] }).items).toEqual([]);
    await db.professional.update({
      where: { id: f.professional.id },
      data: { userId: f.user.id },
    });
    response = await request(app.getHttpServer() as Server)
      .get('/bookings/calendar')
      .query({ from: '2099-01-01', to: '2099-01-02' })
      .set('Authorization', 'Bearer ' + auth)
      .expect(200);
    expect((response.body as { items: unknown[] }).items).toHaveLength(1);
    for (const path of [
      'reschedule-availability',
      'reschedule-availability-days',
    ])
      await request(app.getHttpServer() as Server)
        .get('/bookings/' + f.booking.id + '/' + path)
        .set('Authorization', 'Bearer ' + auth)
        .expect(403);
    await request(app.getHttpServer() as Server)
      .patch('/bookings/' + f.booking.id + '/reschedule')
      .set('Authorization', 'Bearer ' + auth)
      .send({})
      .expect(403);
    await db.membership.delete({
      where: {
        userId_organizationId: { userId: f.user.id, organizationId: f.org.id },
      },
    });
    await request(app.getHttpServer() as Server)
      .get('/bookings/' + f.booking.id)
      .set('Authorization', 'Bearer ' + auth)
      .expect(401);
    await request(app.getHttpServer() as Server)
      .get('/bookings/' + f.booking.id)
      .expect(401);
  });
  it('strict DTOs / no free exclusion / status eligibility / no confirmation', async () => {
    const f = await fixture();
    await request(app.getHttpServer() as Server)
      .get('/bookings/calendar')
      .query({ from: '2099-01-01', to: '2099-01-09' })
      .set('Authorization', 'Bearer ' + token(f.user))
      .expect(400);
    await request(app.getHttpServer() as Server)
      .patch('/bookings/' + f.booking.id + '/reschedule')
      .set('Authorization', 'Bearer ' + token(f.user))
      .send({ ...(await command(f)), professionalId: f.professional.id })
      .expect(400);
    for (const status of ['CANCELLED', 'COMPLETED', 'NO_SHOW'] as const) {
      await db.booking.update({
        where: { id: f.booking.id },
        data: { status },
      });
      await expect(
        calendar.reschedule(f.user, f.booking.id, await command(f)),
      ).rejects.toMatchObject({ status: 409 });
    }
    await db.booking.update({
      where: { id: f.booking.id },
      data: { status: 'PENDING' },
    });
    await db.businessSchedule.update({
      where: { organizationId: f.org.id },
      data: { state: 'UNCONFIRMED', zoneConfirmed: false },
    });
    expect(await calendar.detail(f.user, f.booking.id)).toBeDefined();
    await expect(
      calendar.availabilityForDate(f.user, f.booking.id, '2099-01-02'),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('intersections / exclusive ends / stable pages and concurrent omission forces restart', async () => {
    const f = await fixture();
    await db.booking.update({
      where: { id: f.booking.id },
      data: {
        startTime: new Date('2099-01-01T03:50:00Z'),
        endTime: new Date('2099-01-01T04:20:00Z'),
      },
    });
    const another = await db.booking.create({
      data: {
        organizationId: f.org.id,
        clientId: f.client.id,
        professionalId: f.professional.id,
        serviceId: f.service.id,
        startTime: new Date('2099-01-01T14:00:00Z'),
        endTime: new Date('2099-01-01T14:30:00Z'),
      },
    });
    const query = { from: '2099-01-01', to: '2099-01-02', limit: 1 };
    const first = await calendar.calendar(f.user, query);
    expect(first.items).toHaveLength(1);
    expect(first.items[0].id).toBe(f.booking.id);
    expect(first.nextCursor).toBeTruthy();
    const second = await calendar.calendar(f.user, {
      ...query,
      cursor: first.nextCursor!,
    });
    expect(second.items[0].id).toBe(another.id);
    expect(second.nextCursor).toBeNull();
    await db.booking.update({
      where: { id: another.id },
      data: {
        startTime: new Date('2099-01-01T05:00:00Z'),
        endTime: new Date('2099-01-01T05:30:00Z'),
      },
    });
    await expect(
      calendar.calendar(f.user, { ...query, cursor: first.nextCursor! }),
    ).rejects.toMatchObject({ status: 409 });
    const other = await fixture();
    await expect(
      calendar.calendar(other.user, { ...query, cursor: first.nextCursor! }),
    ).rejects.toMatchObject({ status: 400 });
    const restarted = await calendar.calendar(f.user, { ...query, limit: 200 });
    expect(restarted.items).toHaveLength(2);
  });
  it('legacy reschedule and state writers invalidate M3 even across ABA', async () => {
    const f = await fixture(),
      dto = await command(f);
    await legacy.reschedule(f.booking.id, f.org.id, {
      startTime: '2099-01-03T14:00:00Z',
    });
    await legacy.reschedule(f.booking.id, f.org.id, {
      startTime: f.booking.startTime.toISOString(),
    });
    await expect(
      calendar.reschedule(f.user, f.booking.id, dto),
    ).rejects.toMatchObject({ status: 409 });
    const dto2 = await command(f);
    await legacy.updateStatus(f.booking.id, f.org.id, { status: 'CONFIRMED' });
    await expect(
      calendar.reschedule(f.user, f.booking.id, dto2),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('documents the retained legacy last-writer window without weakening M3 preconditions', async () => {
    const f = await fixture();
    const results = await Promise.allSettled([
      legacy.reschedule(f.booking.id, f.org.id, {
        startTime: '2099-01-02T14:00:00Z',
      }),
      legacy.reschedule(f.booking.id, f.org.id, {
        startTime: '2099-01-03T14:00:00Z',
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    expect(await events(f.booking.id)).toBe(2);
    const persisted = await db.booking.findUniqueOrThrow({
      where: { id: f.booking.id },
    });
    expect(['2099-01-02T14:00:00.000Z', '2099-01-03T14:00:00.000Z']).toContain(
      persisted.startTime.toISOString(),
    );
    console.log(
      JSON.stringify({
        legacyWritersAccepted: 2,
        eventCount: 2,
        retainedLastWriterRisk: true,
      }),
    );
  });
  it('days and slots agree, extra contextual minute stays internal', async () => {
    const f = await fixture();
    const result = await calendar.availabilityDays(f.user, f.booking.id, {
      from: '2099-01-01',
      to: '2099-01-03',
    });
    for (const date of result.availableDates)
      expect(
        (await calendar.availabilityForDate(f.user, f.booking.id, date)).slots
          .length,
      ).toBeGreaterThan(0);
    expect(
      (
        await calendar.availabilityForDate(f.user, f.booking.id, '2099-01-02')
      ).slots.some((s) => s.startTime === '2099-01-02T13:10:00.000Z'),
    ).toBe(true);
    await expect(
      calendar.reschedule(
        f.user,
        f.booking.id,
        await command(f, '2099-01-02T13:17:00Z'),
      ),
    ).rejects.toMatchObject({ status: 409 });
    await originIntact(f);
    expect(await events(f.booking.id)).toBe(0);
  });
  it('same instant in Z or equivalent offset rejects without revision, event or outbox change', async () => {
    const f = await fixture();
    const before = await calendar.detail(f.user, f.booking.id);
    const contactBefore = await db.client.findUniqueOrThrow({
      where: { id: f.client.id },
    });
    const bookingBefore = await db.booking.findUniqueOrThrow({
      where: { id: f.booking.id },
    });
    const outboxBefore = await db.emailOutbox.count({
      where: { organizationId: f.org.id },
    });
    for (const startTime of [
      '2099-01-01T13:10:00.000Z',
      '2099-01-01T09:10:00.000-04:00',
    ]) {
      const response = await request(app.getHttpServer() as Server)
        .patch('/bookings/' + f.booking.id + '/reschedule')
        .set('Authorization', 'Bearer ' + token(f.user))
        .send({
          startTime,
          expectedUpdatedAt: before.updatedAt.toISOString(),
          expectedRevision: before.revision,
        });
      expect(response.status).toBe(400);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(
        await db.booking.findUniqueOrThrow({ where: { id: f.booking.id } }),
      ).toEqual(bookingBefore);
      expect(
        await db.client.findUniqueOrThrow({ where: { id: f.client.id } }),
      ).toEqual(contactBefore);
      expect((await calendar.detail(f.user, f.booking.id)).revision).toBe(
        before.revision,
      );
      expect(await events(f.booking.id)).toBe(0);
      expect(
        await db.emailOutbox.count({ where: { organizationId: f.org.id } }),
      ).toBe(outboxBefore);
    }
    console.log(
      JSON.stringify({
        sameInstantHttp: [400, 400],
        revisionUnchanged: true,
        bookingUnchanged: true,
        events: 0,
        outboxDelta: 0,
      }),
    );
  });
  it('two operators / exactly one write and event', async () => {
    const f = await fixture(),
      dto = await command(f);
    const results = await Promise.allSettled([
      calendar.reschedule(f.user, f.booking.id, dto),
      calendar.reschedule({ ...f.user, id: randomUUID() }, f.booking.id, {
        ...dto,
        startTime: '2099-01-02T15:00:00Z',
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await events(f.booking.id)).toBe(1);
  });
  it('public creation vs M3 at same destination / loser no event and source intact if M3 loses', async () => {
    const f = await fixture(),
      dto = await command(f);
    const results = await Promise.allSettled([
      calendar.reschedule(f.user, f.booking.id, dto),
      publicBooking.createBooking(f.org.slug, {
        professionalId: f.professional.id,
        serviceId: f.service.id,
        startTime: dto.startTime,
        clientName: 'Synthetic guest',
        clientPhone: '+18095550999',
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const destination = await db.booking.findMany({
      where: {
        organizationId: f.org.id,
        startTime: new Date(dto.startTime),
        status: { not: 'CANCELLED' },
      },
    });
    expect(destination).toHaveLength(1);
    if (results[0].status === 'rejected') {
      await originIntact(f);
      expect(await events(f.booking.id)).toBe(0);
    } else {
      expect(await events(f.booking.id)).toBe(1);
      expect(
        await db.client.count({
          where: { organizationId: f.org.id, phone: '+18095550999' },
        }),
      ).toBe(0);
    }
  });
  it.each(['block', 'closure'] as const)(
    '%s races M3 / one winner no rejected mutation event',
    async (kind) => {
      const f = await fixture(),
        dto = await command(f);
      const protection =
        kind === 'block'
          ? availability.createBlock(f.professional.id, f.org.id, f.user.id, {
              startTime: dto.startTime,
              endTime: '2099-01-02T14:30:00Z',
            })
          : schedule.createClosure(f.org.id, f.user.id, {
              expectedRevision: 0,
              startDate: '2099-01-02',
              endDate: '2099-01-02',
              startTime: '10:00',
              endTime: '10:30',
            });
      const results = await Promise.allSettled([
        protection,
        calendar.reschedule(f.user, f.booking.id, dto),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      if (results[1].status === 'rejected') {
        await originIntact(f);
        expect(await events(f.booking.id)).toBe(0);
      } else expect(await events(f.booking.id)).toBe(1);
    },
  );
  it('archive races historical pending M3 into future / one winner', async () => {
    const f = await fixture(true),
      dto = await command(f);
    const results = await Promise.allSettled([
      professionals.archive(f.professional.id, f.org.id, f.user.id),
      calendar.reschedule(f.user, f.booking.id, dto),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    if (results[1].status === 'rejected') {
      await originIntact(f);
      expect(await events(f.booking.id)).toBe(0);
    }
    const p = await db.professional.findUniqueOrThrow({
      where: { id: f.professional.id },
    });
    const b = await db.booking.findUniqueOrThrow({
      where: { id: f.booking.id },
    });
    expect(p.status === 'ARCHIVED' && b.startTime.getTime() > Date.now()).toBe(
      false,
    );
  });
  it('state change wins while M3 waits on Organization / stale rejection source intact', async () => {
    const f = await fixture(),
      dto = await command(f);
    let release: () => void = () => {};
    let ready: () => void = () => {};
    const gate = new Promise<void>((r) => {
        release = r;
      }),
      locked = new Promise<void>((r) => {
        ready = r;
      });
    const writer = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id"=${f.org.id} FOR UPDATE`;
      ready();
      await gate;
      return (
        legacy as unknown as {
          updateStatusInTransaction: (
            tx: Prisma.TransactionClient,
            id: string,
            org: string,
            dto: { status: 'CONFIRMED' },
          ) => Promise<unknown>;
        }
      ).updateStatusInTransaction(tx, f.booking.id, f.org.id, {
        status: 'CONFIRMED',
      });
    });
    // Use real legacy writer on its own transaction, with lock held by another connection.
    await locked;
    const move = calendar.reschedule(f.user, f.booking.id, dto);
    release();
    const results = await Promise.allSettled([writer, move]);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    await originIntact(f);
    expect(await events(f.booking.id)).toBe(1);
  });
  it.each([
    ['read', 60, 40],
    ['availability', 30, 20],
    ['write', 10, 10],
  ] as const)(
    'distributed %s budget two processes',
    async (budget, limit, total) => {
      const key = randomUUID();
      function child() {
        return new Promise<{
          accepted: number;
          blocked: number;
          retries: number[];
          elapsed: number;
        }>((res, rej) => {
          const child = spawn(
            process.execPath,
            [
              resolve(__dirname, '../../test/m3-rate-child.cjs'),
              key,
              String(limit),
              String(total),
            ],
            {
              cwd: resolve(__dirname, '../..'),
              env: {
                ...process.env,
                DATABASE_URL: process.env.C1_RUNTIME_DATABASE_URL,
                M3_BUDGET: budget,
              },
              windowsHide: true,
            },
          );
          let output = '';
          child.stdout.on('data', (d) => {
            output += String(d);
          });
          child.on('error', rej);
          child.on('close', (code) => {
            if (code !== 0) rej(new Error('budget child failed'));
            else
              res(
                JSON.parse(output) as {
                  accepted: number;
                  blocked: number;
                  retries: number[];
                  elapsed: number;
                },
              );
          });
        });
      }
      const hits = await Promise.all([child(), child()]);
      expect(hits.reduce((n, h) => n + h.accepted, 0)).toBe(limit);
      expect(
        hits.flatMap((h) => h.retries).every((n) => n > 0 && n <= 60),
      ).toBe(true);
      console.log(JSON.stringify({ budget, limit, hits }));
    },
  );
  it.each([
    ['read', 61],
    ['availability', 31],
    ['write', 11],
  ] as const)(
    'HTTP %s budget has shared actor/tenant scope and Retry-After',
    async (budget, total) => {
      const f = await fixture();
      const statuses: number[] = [];
      for (let i = 0; i < total; i++) {
        const route = '/bookings/' + f.booking.id;
        const pending =
          budget === 'read'
            ? request(app.getHttpServer() as Server).get(route)
            : budget === 'availability'
              ? request(app.getHttpServer() as Server).get(
                  route +
                    (i % 2
                      ? '/reschedule-availability-days?from=2099-01-02&to=2099-01-02'
                      : '/reschedule-availability?date=2099-01-02'),
                )
              : request(app.getHttpServer() as Server)
                  .patch(route + '/reschedule')
                  .send({});
        const response = await pending.set(
          'Authorization',
          'Bearer ' + token(f.user),
        );
        statuses.push(response.status);
        expect(response.headers['cache-control']).toBe('no-store');
        if (i === total - 1) {
          expect(response.status).toBe(429);
          expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
        } else expect(response.status).toBe(budget === 'write' ? 400 : 200);
      }
      expect(statuses.filter((status) => status === 429)).toHaveLength(1);
      expect(await events(f.booking.id)).toBe(0);
    },
  );
  it('preserves Invoice/Payment/preference and contextual seconds; cannot expose BARBER foreign agenda', async () => {
    const f = await fixture();
    await db.booking.update({
      where: { id: f.booking.id },
      data: {
        startTime: new Date('2099-01-01T13:10:15.123Z'),
        endTime: new Date('2099-01-01T13:40:15.123Z'),
      },
    });
    const invoice = await db.invoice.create({
      data: { organizationId: f.org.id, bookingId: f.booking.id, amount: 1 },
    });
    const payment = await db.payment.create({
      data: {
        organizationId: f.org.id,
        invoiceId: invoice.id,
        method: 'CASH',
        paidAt: new Date(),
        recordedByUserId: f.user.id,
      },
    });
    await db.bookingEmailPreference.create({
      data: {
        bookingId: f.booking.id,
        organizationId: f.org.id,
        clientId: f.client.id,
        optedIn: false,
      },
    });
    const own = await calendar.availabilityForDate(
      f.user,
      f.booking.id,
      '2099-01-01',
    );
    expect(
      own.slots.some((slot) => slot.startTime === '2099-01-01T13:10:15.123Z'),
    ).toBe(true);
    const next = await calendar.availabilityForDate(
      f.user,
      f.booking.id,
      '2099-01-02',
    );
    expect(
      next.slots.some((slot) => slot.startTime === '2099-01-02T13:10:15.123Z'),
    ).toBe(true);
    await calendar.reschedule(
      f.user,
      f.booking.id,
      await command(f, '2099-01-02T13:10:15.123Z'),
    );
    expect(
      await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } }),
    ).toEqual(invoice);
    expect(
      await db.payment.findUniqueOrThrow({ where: { id: payment.id } }),
    ).toEqual(payment);
    expect(
      (
        await db.bookingEmailPreference.findUniqueOrThrow({
          where: {
            bookingId_organizationId: {
              bookingId: f.booking.id,
              organizationId: f.org.id,
            },
          },
        })
      ).optedIn,
    ).toBe(false);
    const b = await fixture();
    await expect(
      calendar.calendar(
        { ...f.user, role: UserRole.BARBER },
        {
          from: '2099-01-01',
          to: '2099-01-02',
          professionalId: b.professional.id,
        },
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('calendar civil ranges preserve DST, displaced midnight and an omitted exclusive boundary', async () => {
    for (const [zone, date, to, hours] of [
      ['America/New_York', '2026-03-08', '2026-03-09', 23],
      ['America/New_York', '2026-11-01', '2026-11-02', 25],
      ['Australia/Lord_Howe', '2026-04-05', '2026-04-06', 24.5],
      ['Australia/Lord_Howe', '2026-10-04', '2026-10-05', 23.5],
      ['America/Sao_Paulo', '2018-11-04', '2018-11-05', 23],
      ['Pacific/Apia', '2011-12-29', '2011-12-30', 24],
    ] as const) {
      const f = await fixture(false, zone);
      const page = await calendar.calendar(f.user, { from: date, to });
      expect(
        (page.rangeEnd.getTime() - page.rangeStart.getTime()) / 3600000,
      ).toBe(hours);
    }
  });
  it('normal maximum 31-day selector completes within its transaction budget', async () => {
    const f = await fixture(),
      start = performance.now();
    const days = await calendar.availabilityDays(f.user, f.booking.id, {
      from: '2099-01-01',
      to: '2099-01-31',
    });
    const elapsedMs = performance.now() - start;
    expect(days.availableDates).toHaveLength(31);
    expect(elapsedMs).toBeLessThan(15000);
    console.log(
      JSON.stringify({
        selectorDays: 31,
        elapsedMs,
        transactionBudgetMs: 15000,
      }),
    );
    await expect(
      calendar.availabilityDays(f.user, f.booking.id, {
        from: '2099-01-01',
        to: '2099-02-01',
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('EXPLAIN synthetic 20000 bookings / existing indexes meet proposed 100ms calendar budget', async () => {
    const f = await fixture();
    await db.professional.createMany({
      data: Array.from({ length: 49 }, () => ({
        organizationId: f.org.id,
        name: 'Synthetic load professional',
        status: 'ACTIVE' as const,
      })),
    });
    await db.$executeRaw`WITH chosen AS (SELECT "id",row_number() OVER (ORDER BY "id") AS position FROM "Professional" WHERE "organizationId"=${f.org.id}) INSERT INTO "Booking" ("id","organizationId","clientId","professionalId","serviceId","startTime","endTime","status","updatedAt") SELECT gen_random_uuid()::text,${f.org.id},${f.client.id},(SELECT "id" FROM chosen WHERE position=1+n%50),${f.service.id}, timestamp '2030-01-01 13:00:00'+n*interval '1 hour', timestamp '2030-01-01 13:30:00'+n*interval '1 hour','COMPLETED'::"BookingStatus",clock_timestamp() FROM generate_series(1,20000) n`;
    await db.$executeRawUnsafe('ANALYZE "Booking"');
    const plans: { scoped: boolean; plan: unknown }[] = [];
    for (const scoped of [false, true]) {
      const plan = await db.$queryRaw(
        Prisma.sql`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT b."id",b."startTime",b."endTime",b."status",b."updatedAt",c."name",c."customerBookingRevision",p."name",s."name" FROM "Booking" b JOIN "Client" c ON c."id"=b."clientId" JOIN "Professional" p ON p."id"=b."professionalId" JOIN "Service" s ON s."id"=b."serviceId" WHERE b."organizationId"=${f.org.id} AND b."startTime"<timestamp '2031-01-08 04:00:00' AND b."endTime">timestamp '2031-01-01 04:00:00' ${scoped ? Prisma.sql`AND b."professionalId"=${f.professional.id}` : Prisma.empty} ORDER BY b."startTime",b."id" LIMIT 201`,
      );
      plans.push({ scoped, plan });
    }
    const times: number[] = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      const page = await calendar.calendar(f.user, {
        from: '2031-01-01',
        to: '2031-01-08',
        limit: 200,
      });
      expect(page.items.length).toBe(168);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    console.log(
      JSON.stringify({
        syntheticBookings: 20000,
        syntheticProfessionals: 50,
        plans,
        calendarTimes: times,
        p95: times[9],
        proposedThresholdMs: 100,
      }),
    );
    expect(times[9]).toBeLessThan(100);
  }, 120000);
});
