import {
  type INestApplication,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { randomUUID, createHmac } from 'node:crypto';
import { ClerkSessionVerifierService } from '../src/auth/clerk/clerk-session-verifier.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EMAIL_NOTICE_VERSION } from '../src/notifications/notification-policy';
import { createE2eApp, requestApp } from './create-e2e-app';

describe('Notifications C1 — HTTP, real guards and PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenant: string;
  let other: string;
  let clientId: string;
  let professionalId: string;
  let serviceId: string;
  const sessions = new Set<string>();
  let actors: Record<string, { id: string; token: string }>;
  const emailNotifications = {
    optedIn: true,
    noticeVersion: EMAIL_NOTICE_VERSION,
    reviewedEmail: 'controlled@example.com',
  };
  const startTime = '2030-01-02T15:00:00Z';

  beforeAll(async () => {
    app = await createE2eApp((builder) =>
      builder
        .overrideProvider(ClerkSessionVerifierService)
        .useValue({
          verify: (req: globalThis.Request) => {
            const token = req.headers
              .get('authorization')
              ?.replace(/^Bearer\s+/i, '');
            if (!token || !sessions.has(token))
              throw new UnauthorizedException('Sesión no válida');
            return Promise.resolve({
              clerkUserId: token,
              sessionId: `session-${token}`,
            });
          },
        })
        .overrideGuard(ThrottlerGuard)
        .useValue({ canActivate: () => true }),
    );
    prisma = app.get(PrismaService);
  });
  afterAll(async () => app.close());
  afterEach(() => jest.restoreAllMocks());

  beforeEach(async () => {
    tenant = randomUUID();
    other = randomUUID();
    actors = {};
    for (const id of [tenant, other])
      await prisma.db.organization.create({
        data: {
          id,
          slug: id,
          name: 'Negocio controlado',
          email: `${id}@example.com`,
          businessHours: { open: '09:00', close: '19:00' },
        },
      });
    for (const role of Object.values(UserRole)) {
      const token = randomUUID();
      const user = await prisma.db.user.create({
        data: {
          name: role,
          email: `${token}@example.com`,
          clerkUserId: token,
          memberships: { create: { organizationId: tenant, role } },
        },
      });
      actors[role] = { id: user.id, token };
      sessions.add(token);
    }
    clientId = (
      await prisma.db.client.create({
        data: {
          organizationId: tenant,
          name: 'Cliente controlado',
          email: emailNotifications.reviewedEmail,
          phone: '+18095550000',
        },
      })
    ).id;
    serviceId = (
      await prisma.db.service.create({
        data: {
          organizationId: tenant,
          name: 'Servicio controlado',
          duration: 30,
          price: 100,
        },
      })
    ).id;
    professionalId = (
      await prisma.db.professional.create({
        data: {
          organizationId: tenant,
          name: 'Profesional controlado',
          status: 'ACTIVE',
          userId: actors.BARBER.id,
          isPublic: true,
        },
      })
    ).id;
  });

  function auth(role = 'OWNER', organizationId = tenant) {
    return {
      Authorization: `Bearer ${actors[role].token}`,
      'x-organization-id': organizationId,
    };
  }
  async function create() {
    const response = await requestApp(app)
      .post('/bookings')
      .set(auth())
      .send({
        clientId,
        professionalId,
        serviceId,
        startTime,
        emailNotifications,
      })
      .expect((response) => {
        if (response.status !== 201)
          throw new Error(JSON.stringify(response.body));
      })
      .expect(201);
    const body = response.body as { id: string; status: string };
    expect(body.status).toBe('PENDING');
    return body.id;
  }

  it('captures creation, confirmation, rescheduling and cancellation once through HTTP', async () => {
    const id = await create();
    await requestApp(app)
      .patch(`/bookings/${id}/status`)
      .set(auth())
      .send({ status: 'CONFIRMED' })
      .expect(200);
    await requestApp(app)
      .patch(`/bookings/${id}/status`)
      .set(auth())
      .send({ status: 'CONFIRMED' })
      .expect(200);
    const reschedule = { startTime: '2030-01-03T16:00:00Z' };
    await requestApp(app)
      .patch(`/bookings/${id}`)
      .set(auth())
      .send(reschedule)
      .expect(200);
    await requestApp(app)
      .patch(`/bookings/${id}`)
      .set(auth())
      .send(reschedule)
      .expect(200);
    await requestApp(app)
      .patch(`/bookings/${id}/status`)
      .set(auth())
      .send({ status: 'CANCELLED' })
      .expect(200);
    const events = await prisma.db.bookingEmailEvent.findMany({
      where: { bookingId: id },
      orderBy: { sequence: 'asc' },
    });
    expect(events.map((event) => event.kind)).toEqual([
      'CREATED',
      'CONFIRMED',
      'RESCHEDULED',
      'CANCELLED',
    ]);
    expect(events[2].startTime.toISOString()).toBe(
      reschedule.startTime.replace('Z', '.000Z'),
    );
    const rows = await prisma.db.emailOutbox.findMany({
      where: { bookingId: id },
      orderBy: { eventSequence: 'asc' },
    });
    expect(rows.map((row) => row.status)).toEqual([
      'OBSOLETE',
      'OBSOLETE',
      'OBSOLETE',
      'PENDING',
    ]);
  });

  it('reprograms PENDING once and emits no email for only changing the professional', async () => {
    const id = await create();
    const nextStart = '2030-01-03T16:00:00Z';
    await requestApp(app)
      .patch(`/bookings/${id}`)
      .set(auth())
      .send({ startTime: nextStart })
      .expect(200);
    const second = await prisma.db.professional.create({
      data: {
        organizationId: tenant,
        name: 'Segundo profesional',
        status: 'ACTIVE',
      },
    });
    await requestApp(app)
      .patch(`/bookings/${id}`)
      .set(auth())
      .send({ startTime: nextStart, professionalId: second.id })
      .expect(200);
    const events = await prisma.db.bookingEmailEvent.findMany({
      where: { bookingId: id },
      orderBy: { sequence: 'asc' },
    });
    expect(events.map((event) => event.kind)).toEqual([
      'CREATED',
      'RESCHEDULED',
      'INVALIDATED',
    ]);
    expect(events[1].bookingStatus).toBe('PENDING');
    expect(events[1].startTime).toEqual(new Date(nextStart));
    expect(
      await prisma.db.emailOutbox.count({ where: { bookingId: id } }),
    ).toBe(2);
  });

  it('captures reactivation and suppresses the pending message on NO_SHOW without a new email', async () => {
    const id = await create();
    for (const status of ['CANCELLED', 'CONFIRMED', 'CONFIRMED']) {
      await requestApp(app)
        .patch(`/bookings/${id}/status`)
        .set(auth())
        .send({ status })
        .expect(200);
    }
    await prisma.db.booking.update({
      where: { id },
      data: {
        startTime: new Date('2020-01-02T15:00:00Z'),
        endTime: new Date('2020-01-02T15:30:00Z'),
      },
    });
    await requestApp(app)
      .patch(`/bookings/${id}/status`)
      .set(auth())
      .send({ status: 'NO_SHOW' })
      .expect(200);
    const events = await prisma.db.bookingEmailEvent.findMany({
      where: { bookingId: id },
      orderBy: { sequence: 'asc' },
    });
    expect(events.map((event) => event.kind)).toEqual([
      'CREATED',
      'CANCELLED',
      'CONFIRMED',
      'INVALIDATED',
    ]);
    const intents = await prisma.db.emailOutbox.findMany({
      where: { bookingId: id },
    });
    expect(intents).toHaveLength(3);
    expect(intents.every((row) => row.status === 'OBSOLETE')).toBe(true);
  });

  it.each(['missing', 'foreign'])(
    'BARBER with %s professional link cannot mutate or inspect the booking notifications',
    async (link) => {
      const id = await create();
      await prisma.db.professional.update({
        where: { id: professionalId },
        data: { userId: null },
      });
      if (link === 'foreign')
        await prisma.db.professional.create({
          data: {
            organizationId: tenant,
            name: 'Otro profesional',
            userId: actors.BARBER.id,
            status: 'ACTIVE',
          },
        });
      await requestApp(app)
        .patch(`/bookings/${id}/status`)
        .set(auth('BARBER'))
        .send({ status: 'CONFIRMED' })
        .expect(link === 'missing' ? 403 : 404);
      await requestApp(app)
        .get(`/bookings/${id}/notifications`)
        .set(auth('BARBER'))
        .expect(403);
      await requestApp(app)
        .patch(`/bookings/${id}/email-preference`)
        .set(auth('BARBER'))
        .send({ expectedVersion: 1, ...emailNotifications })
        .expect(403);
      expect(
        await prisma.db.bookingEmailEvent.count({ where: { bookingId: id } }),
      ).toBe(1);
    },
  );

  it('rejects early COMPLETED and captures one real completion, including BARBER own', async () => {
    const id = await create();
    await requestApp(app)
      .patch(`/bookings/${id}/status`)
      .set(auth('BARBER'))
      .send({ status: 'CONFIRMED' })
      .expect(200);
    await requestApp(app)
      .patch(`/bookings/${id}/status`)
      .set(auth('BARBER'))
      .send({ status: 'COMPLETED' })
      .expect(409);
    await prisma.db.booking.update({
      where: { id },
      data: {
        startTime: new Date('2020-01-02T15:00:00Z'),
        endTime: new Date('2020-01-02T15:30:00Z'),
      },
    });
    await requestApp(app)
      .patch(`/bookings/${id}/status`)
      .set(auth('BARBER'))
      .send({ status: 'COMPLETED' })
      .expect(200);
    await requestApp(app)
      .patch(`/bookings/${id}/status`)
      .set(auth('BARBER'))
      .send({ status: 'COMPLETED' })
      .expect(200);
    expect(
      await prisma.db.bookingEmailEvent.count({
        where: { bookingId: id, kind: 'COMPLETED' },
      }),
    ).toBe(1);
  });

  it.each(['OWNER', 'ADMIN', 'RECEPTIONIST'])(
    '%s reads only authorized reservation summaries without PII',
    async (role) => {
      const id = await create();
      const response = await requestApp(app)
        .get(`/bookings/${id}/notifications`)
        .set(auth(role))
        .expect(200);
      expect(response.headers['cache-control']).toBe('no-store');
      const data = response.body as {
        data: Record<string, unknown>[];
        pagination: { total: number };
      };
      expect(data.pagination.total).toBe(1);
      expect(Object.keys(data.data[0]).sort()).toEqual(
        [
          'attempts',
          'bookingId',
          'canRetry',
          'channel',
          'createdAt',
          'event',
          'id',
          'reason',
          'recipientMasked',
          'status',
        ].sort(),
      );
      expect(JSON.stringify(response.body)).not.toContain(
        emailNotifications.reviewedEmail,
      );
      expect(JSON.stringify(response.body)).not.toContain('Cliente controlado');
      await requestApp(app)
        .get('/notifications')
        .set(auth(role))
        .expect(role === 'RECEPTIONIST' ? 403 : 200);
    },
  );

  it.each(['BARBER', 'CUSTOMER'])(
    '%s cannot read or modify notifications even for an own booking',
    async (role) => {
      const id = await create();
      const intent = await prisma.db.emailOutbox.findFirstOrThrow({
        where: { bookingId: id },
      });
      await requestApp(app)
        .get(`/bookings/${id}/notifications`)
        .set(auth(role))
        .expect(403);
      await requestApp(app)
        .get(`/bookings/${id}/email-preference`)
        .set(auth(role))
        .expect(403);
      await requestApp(app)
        .patch(`/bookings/${id}/email-preference`)
        .set(auth(role))
        .send({ expectedVersion: 1, ...emailNotifications })
        .expect(403);
      await requestApp(app)
        .post(`/notifications/${intent.id}/retry`)
        .set(auth(role))
        .send({})
        .expect(403);
    },
  );

  it('rejects arbitrary tenant selection, revoked membership and foreign resource IDs', async () => {
    const id = await create();
    await requestApp(app)
      .get(`/bookings/${id}/notifications`)
      .set(auth('OWNER', other))
      .expect(401);
    await prisma.db.membership.create({
      data: { organizationId: other, userId: actors.OWNER.id, role: 'OWNER' },
    });
    await requestApp(app)
      .get(`/bookings/${id}/notifications`)
      .set(auth('OWNER', other))
      .expect(404);
    const intent = await prisma.db.emailOutbox.findFirstOrThrow({
      where: { bookingId: id },
    });
    await requestApp(app)
      .post(`/notifications/${intent.id}/retry`)
      .set(auth('OWNER', other))
      .send({})
      .expect(404);
    await prisma.db.membership.deleteMany({
      where: { organizationId: tenant, userId: actors.OWNER.id },
    });
    await requestApp(app)
      .get(`/bookings/${id}/notifications`)
      .set(auth())
      .expect(401);
  });

  it('withdraws preference, rejects a stale update and never revives the omitted event', async () => {
    const id = await create();
    await requestApp(app)
      .patch(`/bookings/${id}/email-preference`)
      .set(auth('RECEPTIONIST'))
      .send({
        expectedVersion: 1,
        optedIn: false,
        noticeVersion: EMAIL_NOTICE_VERSION,
      })
      .expect(200);
    await requestApp(app)
      .patch(`/bookings/${id}/email-preference`)
      .set(auth())
      .send({ expectedVersion: 1, ...emailNotifications })
      .expect(409);
    await requestApp(app)
      .patch(`/bookings/${id}/email-preference`)
      .set(auth())
      .send({ expectedVersion: 2, ...emailNotifications })
      .expect(200);
    expect(
      (
        await prisma.db.emailOutbox.findFirstOrThrow({
          where: { bookingId: id },
        })
      ).status,
    ).toBe('OBSOLETE');
  });

  it('returns empty history and rejects unknown fields and invalid pagination', async () => {
    const row = await prisma.db.booking.create({
      data: {
        clientId,
        professionalId,
        serviceId,
        organizationId: tenant,
        startTime: new Date(startTime),
        endTime: new Date('2030-01-02T15:30:00Z'),
      },
    });
    const response = await requestApp(app)
      .get(`/bookings/${row.id}/notifications`)
      .set(auth())
      .expect(200);
    expect((response.body as { data: unknown[] }).data).toEqual([]);
    await requestApp(app)
      .get('/notifications?limit=51')
      .set(auth())
      .expect(400);
    await requestApp(app)
      .patch(`/bookings/${row.id}/email-preference`)
      .set(auth())
      .send({
        expectedVersion: 0,
        ...emailNotifications,
        organizationId: other,
      })
      .expect(400);
    await requestApp(app)
      .post('/bookings')
      .set(auth('BARBER'))
      .send({
        clientId,
        professionalId,
        serviceId,
        startTime,
        emailNotifications,
      })
      .expect(403);
    await requestApp(app)
      .post('/bookings')
      .set(auth())
      .send({
        clientId,
        professionalId,
        serviceId,
        startTime,
        emailNotifications: null,
      })
      .expect(400);
  });

  it.each([true, false])(
    'public reused client corroboration matches=%s without exposing historic email',
    async (matches) => {
      await prisma.db.cmsPage.update({
        where: { organizationId: tenant },
        data: {
          isPublished: true,
          publishedRevision: 0,
          publishedSnapshot: {
            publicName: 'Negocio controlado',
            phone: null,
            description: null,
            address: null,
            googleMapsUrl: null,
          },
        },
      });
      const response = await requestApp(app)
        .post(`/public/${tenant}/bookings`)
        .send({
          professionalId,
          serviceId,
          startTime,
          clientName: 'Cliente controlado',
          clientPhone: '+18095550000',
          clientEmail: matches
            ? emailNotifications.reviewedEmail
            : 'different@example.com',
          emailNotifications: {
            optedIn: true,
            noticeVersion: EMAIL_NOTICE_VERSION,
          },
        })
        .expect(201);
      const id = (response.body as { booking: { id: string } }).booking.id;
      expect(JSON.stringify(response.body)).not.toContain(
        emailNotifications.reviewedEmail,
      );
      expect(JSON.stringify(response.body)).not.toContain('emailNotifications');
      expect(
        await prisma.db.emailOutbox.findFirstOrThrow({
          where: { bookingId: id },
        }),
      ).toMatchObject({
        status: matches ? 'PENDING' : 'OMITTED',
        reason: matches ? null : 'CONTACT_NOT_REVIEWED',
      });
    },
  );

  it('paginates, retries only the same eligible intent and masks storage errors', async () => {
    const bookingId = await create();
    const row = await prisma.db.emailOutbox.findFirstOrThrow({
      where: { bookingId },
    });
    await requestApp(app)
      .get('/notifications?page=1&limit=1')
      .set(auth())
      .expect(200);
    await requestApp(app)
      .post(`/notifications/${row.id}/retry`)
      .set(auth())
      .send({})
      .expect(409);
    await prisma.db.emailOutbox.update({
      where: { id: row.id },
      data: { status: 'RETRY', attempts: 1 },
    });
    await requestApp(app)
      .post(`/notifications/${row.id}/retry`)
      .set(auth('RECEPTIONIST'))
      .send({})
      .expect(403);
    await requestApp(app)
      .post(`/notifications/${row.id}/retry`)
      .set(auth('ADMIN'))
      .send({})
      .expect(200);
    await requestApp(app)
      .post(`/notifications/${row.id}/retry`)
      .set(auth())
      .send({ to: 'arbitrary@example.com' })
      .expect(400);
    expect(await prisma.db.emailOutbox.count({ where: { bookingId } })).toBe(1);
    await prisma.db.emailOutbox.update({
      where: { id: row.id },
      data: { status: 'UNCERTAIN' },
    });
    await requestApp(app)
      .post(`/notifications/${row.id}/retry`)
      .set(auth())
      .send({})
      .expect(409);
    const logs = [
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined),
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined),
      jest.spyOn(console, 'error').mockImplementation(() => undefined),
      jest.spyOn(console, 'warn').mockImplementation(() => undefined),
    ];
    jest.spyOn(prisma.db.emailOutbox, 'count').mockImplementationOnce(() => {
      throw new Error(
        `PRIVATE_STORAGE_DETAILS ${emailNotifications.reviewedEmail}`,
      );
    });
    const error = await requestApp(app)
      .get('/notifications')
      .set(auth())
      .expect(503);
    expect(JSON.stringify(error.body)).not.toContain('PRIVATE_STORAGE_DETAILS');
    const captured = JSON.stringify(logs.map((log) => log.mock.calls));
    expect(captured).not.toContain('PRIVATE_STORAGE_DETAILS');
    expect(captured).not.toContain(emailNotifications.reviewedEmail);
    const audit = await prisma.db.auditLog.findMany({
      where: { organizationId: tenant },
    });
    expect(JSON.stringify(audit)).not.toContain(
      emailNotifications.reviewedEmail,
    );
  });

  it.each(['new', 'reactivated', 'omitted-email', 'no-opt-in'] as const)(
    'public %s preserves consent/contact rules',
    async (mode) => {
      await prisma.db.cmsPage.update({
        where: { organizationId: tenant },
        data: {
          isPublished: true,
          publishedRevision: 0,
          publishedSnapshot: {
            publicName: 'Negocio controlado',
            phone: null,
            description: null,
            address: null,
            googleMapsUrl: null,
          },
        },
      });
      if (mode === 'reactivated')
        await prisma.db.client.update({
          where: { id: clientId },
          data: { isActive: false },
        });
      const response = await requestApp(app)
        .post(`/public/${tenant}/bookings`)
        .send({
          professionalId,
          serviceId,
          startTime,
          clientName: 'Cliente controlado',
          clientPhone: mode === 'new' ? '+18095551111' : '+18095550000',
          ...(mode !== 'omitted-email'
            ? {
                clientEmail:
                  mode === 'new'
                    ? 'new@example.com'
                    : emailNotifications.reviewedEmail,
              }
            : {}),
          ...(mode !== 'no-opt-in'
            ? {
                emailNotifications: {
                  optedIn: true,
                  noticeVersion: EMAIL_NOTICE_VERSION,
                },
              }
            : {}),
        })
        .expect(201);
      const bookingId = (response.body as { booking: { id: string } }).booking
        .id;
      const row = await prisma.db.emailOutbox.findFirstOrThrow({
        where: { bookingId },
      });
      expect(row.status).toBe(
        mode === 'new' || mode === 'reactivated' ? 'PENDING' : 'OMITTED',
      );
      if (mode === 'reactivated')
        expect(
          (
            await prisma.db.client.findUniqueOrThrow({
              where: { id: clientId },
            })
          ).isActive,
        ).toBe(true);
      if (mode === 'omitted-email' || mode === 'no-opt-in') {
        await requestApp(app)
          .patch(`/bookings/${bookingId}/status`)
          .set(auth())
          .send({ status: 'CONFIRMED' })
          .expect(200);
        expect(
          await prisma.db.emailOutbox.count({
            where: { bookingId, status: 'PENDING' },
          }),
        ).toBe(0);
      }
      expect(JSON.stringify(response.body)).not.toContain('@');
    },
  );

  it('authenticates webhook bytes, deduplicates delivery and asks for retry on unknown correlation', async () => {
    const bookingId = await create();
    const row = await prisma.db.emailOutbox.findFirstOrThrow({
      where: { bookingId },
    });
    const providerId = randomUUID();
    await prisma.db.emailOutbox.update({
      where: { id: row.id },
      data: { providerId, status: 'ACCEPTED', closedAt: new Date() },
    });
    const secret = Buffer.alloc(32, 7);
    const previous = process.env.RESEND_WEBHOOK_SECRET;
    process.env.RESEND_WEBHOOK_SECRET = `whsec_${secret.toString('base64')}`;
    try {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const externalId = randomUUID();
      const body = JSON.stringify({
        type: 'email.delivered',
        created_at: new Date().toISOString(),
        data: { email_id: providerId },
      });
      const signature = createHmac('sha256', secret)
        .update(`${externalId}.${timestamp}.${body}`)
        .digest('base64');
      const headers = {
        'Content-Type': 'application/json',
        'svix-id': externalId,
        'svix-timestamp': timestamp,
        'svix-signature': `v1,${signature}`,
      };
      await requestApp(app)
        .post('/notifications/resend/webhook')
        .set(headers)
        .send(body)
        .expect(204);
      await requestApp(app)
        .post('/notifications/resend/webhook')
        .set(headers)
        .send(body)
        .expect(204);
      await requestApp(app)
        .post('/notifications/resend/webhook')
        .set(headers)
        .send(body + ' ')
        .expect(401);
      expect(
        await prisma.db.emailWebhookReceipt.count({
          where: { notificationId: row.id },
        }),
      ).toBe(1);
      expect(
        (
          await prisma.db.emailOutbox.findUniqueOrThrow({
            where: { id: row.id },
          })
        ).status,
      ).toBe('DELIVERED');
      const missingBody = JSON.stringify({
        type: 'email.delivered',
        created_at: new Date().toISOString(),
        data: { email_id: randomUUID() },
      });
      const missingSignature = createHmac('sha256', secret)
        .update(`${externalId}.${timestamp}.${missingBody}`)
        .digest('base64');
      await requestApp(app)
        .post('/notifications/resend/webhook')
        .set({ ...headers, 'svix-signature': `v1,${missingSignature}` })
        .send(missingBody)
        .expect(503);
    } finally {
      if (previous === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
      else process.env.RESEND_WEBHOOK_SECRET = previous;
    }
  });
});
