import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BookingStatus, UserRole } from '@prisma/client';
import { ClerkSessionVerifierService } from '../src/auth/clerk/clerk-session-verifier.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, requestApp } from './create-e2e-app';

interface ClerkProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: null;
  primaryEmailAddressId: string;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification: { status: string };
  }>;
}

describe('Clerk customer booking claims (e2e PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const sessions = new Map<string, string>();
  const profiles = new Map<string, ClerkProfile>();
  const verifier = {
    verify: jest.fn().mockImplementation((request: globalThis.Request) => {
      const token = request.headers
        .get('authorization')
        ?.replace(/^Bearer\s+/i, '');
      const clerkUserId = token ? sessions.get(token) : undefined;
      if (!clerkUserId) {
        return Promise.reject(new UnauthorizedException('Sesión no válida'));
      }
      return Promise.resolve({ clerkUserId, sessionId: `sess_${clerkUserId}` });
    }),
    getClient: jest.fn().mockReturnValue({
      users: {
        getUser: jest
          .fn()
          .mockImplementation((clerkUserId: string) =>
            Promise.resolve(profiles.get(clerkUserId) ?? null),
          ),
      },
    }),
  };

  const unique = (label: string) =>
    `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  function addIdentity(token: string, clerkUserId: string, email: string) {
    sessions.set(token, clerkUserId);
    profiles.set(clerkUserId, {
      id: clerkUserId,
      firstName: 'Customer',
      lastName: 'QA',
      username: null,
      primaryEmailAddressId: `email_${clerkUserId}`,
      emailAddresses: [
        {
          id: `email_${clerkUserId}`,
          emailAddress: email,
          verification: { status: 'verified' },
        },
      ],
    });
  }

  async function createBooking(email: string) {
    const suffix = unique('claim');
    const organization = await prisma.db.organization.create({
      data: {
        name: 'Claim tenant',
        slug: suffix,
        email: `${suffix}@organization.test`,
      },
    });
    const [client, professional, service] = await Promise.all([
      prisma.db.client.create({
        data: { organizationId: organization.id, name: 'Customer', email },
      }),
      prisma.db.professional.create({
        data: {
          organizationId: organization.id,
          name: 'Professional',
          status: 'ACTIVE',
          isPublic: true,
        },
      }),
      prisma.db.service.create({
        data: {
          organizationId: organization.id,
          name: 'Service',
          duration: 30,
          price: 25,
        },
      }),
    ]);
    const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const booking = await prisma.db.booking.create({
      data: {
        organizationId: organization.id,
        clientId: client.id,
        professionalId: professional.id,
        serviceId: service.id,
        startTime,
        endTime: new Date(startTime.getTime() + 30 * 60 * 1000),
        status: BookingStatus.PENDING,
      },
    });
    return { organization, client, booking };
  }

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

  beforeEach(() => {
    sessions.clear();
    profiles.clear();
  });

  afterAll(async () => app.close());

  it('crea el vínculo con 201 y repite con 200 sin Membership ni duplicados', async () => {
    const email = `${unique('idempotent')}@customer.test`;
    const fixture = await createBooking(email);
    const clerkUserId = `user_${unique('idempotent')}`;
    addIdentity('idempotent-token', clerkUserId, email);
    const payload = {
      bookingId: fixture.booking.id,
      organizationSlug: fixture.organization.slug,
    };

    const first = await requestApp(app)
      .post('/auth/clerk/customer/claims')
      .set('Authorization', 'Bearer idempotent-token')
      .send(payload);
    const repeated = await requestApp(app)
      .post('/auth/clerk/customer/claims')
      .set('Authorization', 'Bearer idempotent-token')
      .send(payload);

    expect(first.status).toBe(201);
    expect(repeated.status).toBe(200);
    expect(first.body as unknown).toEqual({ claimed: true });
    expect(repeated.body as unknown).toEqual({ claimed: true });
    const user = await prisma.db.user.findUniqueOrThrow({
      where: { clerkUserId },
      include: { memberships: true },
    });
    expect(user.password).toBeNull();
    expect(user.memberships).toHaveLength(0);
    expect(
      await prisma.db.client.findUniqueOrThrow({
        where: { id: fixture.client.id },
      }),
    ).toMatchObject({ userId: user.id });
    expect(
      await prisma.db.auditLog.count({
        where: {
          organizationId: fixture.organization.id,
          userId: user.id,
          action: 'LINK',
          entity: 'Client',
          entityId: fixture.client.id,
        },
      }),
    ).toBe(1);
  });

  it('serializa dos reclamos iguales en 201/200 con un solo agregado', async () => {
    const email = `${unique('race-same')}@customer.test`;
    const fixture = await createBooking(email);
    const clerkUserId = `user_${unique('race-same')}`;
    addIdentity('race-same-token', clerkUserId, email);
    const call = () =>
      requestApp(app)
        .post('/auth/clerk/customer/claims')
        .set('Authorization', 'Bearer race-same-token')
        .send({
          bookingId: fixture.booking.id,
          organizationSlug: fixture.organization.slug,
        });

    const responses = await Promise.all([call(), call()]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 201]);
    expect(await prisma.db.user.count({ where: { clerkUserId } })).toBe(1);
    expect(
      await prisma.db.auditLog.count({
        where: { entityId: fixture.client.id, action: 'LINK' },
      }),
    ).toBe(1);
  });

  it('devuelve el mismo 404 para slug ajeno y no revela el tenant', async () => {
    const email = `${unique('tenant')}@customer.test`;
    const fixture = await createBooking(email);
    const other = await createBooking(`${unique('other')}@customer.test`);
    const clerkUserId = `user_${unique('tenant')}`;
    addIdentity('tenant-token', clerkUserId, email);

    const response = await requestApp(app)
      .post('/auth/clerk/customer/claims')
      .set('Authorization', 'Bearer tenant-token')
      .send({
        bookingId: fixture.booking.id,
        organizationSlug: other.organization.slug,
      });
    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain(
      fixture.organization.id,
    );
    expect(await prisma.db.user.count({ where: { clerkUserId } })).toBe(0);
  });

  it('rechaza 409 ante cualquier User local por correo, incluido CUSTOMER legacy, sin escrituras', async () => {
    const email = `${unique('legacy')}@customer.test`;
    const fixture = await createBooking(email);
    const legacyUser = await prisma.db.user.create({
      data: { name: 'Legacy customer', email, password: 'legacy-hash' },
    });
    await prisma.db.membership.create({
      data: {
        userId: legacyUser.id,
        organizationId: fixture.organization.id,
        role: UserRole.CUSTOMER,
      },
    });
    const clerkUserId = `user_${unique('legacy')}`;
    addIdentity('legacy-token', clerkUserId, email);
    const before = {
      users: await prisma.db.user.count(),
      memberships: await prisma.db.membership.count(),
      audits: await prisma.db.auditLog.count(),
    };

    const response = await requestApp(app)
      .post('/auth/clerk/customer/claims')
      .set('Authorization', 'Bearer legacy-token')
      .send({
        bookingId: fixture.booking.id,
        organizationSlug: fixture.organization.slug,
      });
    expect(response.status).toBe(409);
    expect(response.body as unknown).toEqual({
      message: 'No es posible reclamar esta reserva.',
      error: 'Conflict',
      statusCode: 409,
    });
    expect(await prisma.db.user.count()).toBe(before.users);
    expect(await prisma.db.membership.count()).toBe(before.memberships);
    expect(await prisma.db.auditLog.count()).toBe(before.audits);
    expect(
      await prisma.db.client.findUniqueOrThrow({
        where: { id: fixture.client.id },
      }),
    ).toMatchObject({ userId: null });
  });

  it('solo permite un ganador si dos identidades verificadas reclaman a la vez', async () => {
    const email = `${unique('race-different')}@customer.test`;
    const fixture = await createBooking(email);
    const clerkIds = [`user_${unique('race-a')}`, `user_${unique('race-b')}`];
    addIdentity('race-a-token', clerkIds[0], email);
    addIdentity('race-b-token', clerkIds[1], email);
    const call = (token: string) =>
      requestApp(app)
        .post('/auth/clerk/customer/claims')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bookingId: fixture.booking.id,
          organizationSlug: fixture.organization.slug,
        });

    const responses = await Promise.all([
      call('race-a-token'),
      call('race-b-token'),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(
      await prisma.db.user.count({
        where: { clerkUserId: { in: clerkIds } },
      }),
    ).toBe(1);
    expect(
      await prisma.db.auditLog.count({
        where: { entityId: fixture.client.id, action: 'LINK' },
      }),
    ).toBe(1);
  });
});
