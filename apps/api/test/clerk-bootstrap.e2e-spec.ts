import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { request as httpRequest, type Server } from 'node:http';
import { ClerkSessionVerifierService } from '../src/auth/clerk/clerk-session-verifier.service';
import { ORGANIZATION_ID_HEADER } from '../src/auth/guards/clerk-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, requestApp } from './create-e2e-app';

interface Fixture {
  organizationId: string;
  userId: string;
  token: string;
}

function accessToken(body: unknown): string {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('accessToken' in body) ||
    typeof body.accessToken !== 'string'
  ) {
    throw new Error('La respuesta legacy no incluyó accessToken.');
  }
  return body.accessToken;
}

function duplicateOrganizationHeader(
  app: INestApplication,
  token: string,
  organizationId: string,
): Promise<number> {
  const server = app.getHttpServer() as Server;
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('El servidor E2E no tiene puerto TCP.');
  }

  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: address.address,
        port: address.port,
        path: '/organizations/mine',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          [ORGANIZATION_ID_HEADER]: [organizationId, organizationId],
        },
      },
      (response) => {
        response.resume();
        response.on('end', () => resolve(response.statusCode ?? 0));
      },
    );
    request.on('error', reject);
    request.end();
  });
}

describe('Security A0.5-A bootstrap and B2B dual auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sequence = 0;
  const sessions = new Map<string, string>();

  const verifier = {
    verify: jest.fn((request: globalThis.Request) => {
      const token = request.headers
        .get('authorization')
        ?.replace(/^Bearer\s+/i, '');
      const clerkUserId = token ? sessions.get(token) : undefined;
      if (!clerkUserId) {
        return Promise.reject(new UnauthorizedException('Sesión no válida'));
      }
      return Promise.resolve({
        clerkUserId,
        sessionId: `session_${clerkUserId}`,
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
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => app.close());

  function unique(label: string): string {
    sequence += 1;
    return `${label}-${Date.now()}-${sequence}`;
  }

  async function fixture(role: UserRole): Promise<Fixture> {
    const key = unique(role.toLowerCase());
    const organization = await prisma.db.organization.create({
      data: {
        name: `Organization ${key}`,
        slug: `bootstrap-${key}`,
        email: `org-${key}@bootstrap.test`,
      },
    });
    const clerkUserId = `user_${key}`;
    const user = await prisma.db.user.create({
      data: {
        name: `User ${role}`,
        email: `user-${key}@bootstrap.test`,
        password: null,
        clerkUserId,
        lastOrganizationId: organization.id,
      },
    });
    await prisma.db.membership.create({
      data: { userId: user.id, organizationId: organization.id, role },
    });
    const token = `token_${key}`;
    sessions.set(token, clerkUserId);
    return { organizationId: organization.id, userId: user.id, token };
  }

  it('distingue onboarding requerido sin enlazar ni buscar por correo', async () => {
    const token = `token_${unique('new-session')}`;
    sessions.set(token, `user_${unique('not-linked')}`);

    const response = await requestApp(app)
      .get('/auth/clerk/bootstrap')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body as unknown).toEqual({
      state: 'ONBOARDING_REQUIRED',
      user: null,
      preferredOrganizationId: null,
      memberships: [],
    });
  });

  it('devuelve únicamente Memberships B2B y una preferencia autorizada', async () => {
    const first = await fixture(UserRole.BARBER);
    const second = await fixture(UserRole.ADMIN);
    const firstUser = await prisma.db.user.findUniqueOrThrow({
      where: { id: first.userId },
    });
    await prisma.db.membership.create({
      data: {
        userId: first.userId,
        organizationId: second.organizationId,
        role: UserRole.ADMIN,
      },
    });
    const customerOrg = await prisma.db.organization.create({
      data: {
        name: `Customer ${unique('org')}`,
        slug: unique('customer-org'),
        email: `${unique('customer-org')}@bootstrap.test`,
      },
    });
    await prisma.db.membership.create({
      data: {
        userId: first.userId,
        organizationId: customerOrg.id,
        role: UserRole.CUSTOMER,
      },
    });
    await prisma.db.user.update({
      where: { id: first.userId },
      data: { lastOrganizationId: second.organizationId },
    });

    const response = await requestApp(app)
      .get('/auth/clerk/bootstrap')
      .set('Authorization', `Bearer ${first.token}`)
      .expect(200);

    expect(response.body as unknown).toMatchObject({
      state: 'READY',
      user: { id: first.userId, name: firstUser.name },
      preferredOrganizationId: second.organizationId,
      memberships: [
        {
          role: UserRole.ADMIN,
          organization: { id: second.organizationId },
        },
        {
          role: UserRole.BARBER,
          organization: { id: first.organizationId },
        },
      ],
    });
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain(firstUser.email);
    expect(serialized).not.toContain(firstUser.clerkUserId ?? 'never');
    expect(serialized).not.toContain(customerOrg.id);
    expect(serialized).not.toContain('createdAt');
  });

  it('devuelve NO_ACCESS para identidad enlazada sin Membership B2B', async () => {
    const target = await fixture(UserRole.CUSTOMER);

    const response = await requestApp(app)
      .get('/auth/clerk/bootstrap')
      .set('Authorization', `Bearer ${target.token}`)
      .expect(200);

    expect(response.body as unknown).toMatchObject({
      state: 'NO_ACCESS',
      preferredOrganizationId: null,
      memberships: [],
    });
  });

  it('rechaza sesión ausente o revocada con respuesta genérica', async () => {
    const response = await requestApp(app)
      .get('/auth/clerk/bootstrap')
      .set('Authorization', 'Bearer revoked-token')
      .expect(401);

    expect(response.body as unknown).toMatchObject({
      message: 'Sesión no válida',
      statusCode: 401,
    });
  });

  it('permite sesión Clerk en una ruta B2B y mantiene tenant autoritativo', async () => {
    const actor = await fixture(UserRole.OWNER);
    const foreign = await fixture(UserRole.OWNER);

    await requestApp(app)
      .get('/organizations/mine')
      .set('Authorization', `Bearer ${actor.token}`)
      .set(ORGANIZATION_ID_HEADER, actor.organizationId)
      .expect(200);

    await requestApp(app)
      .get('/organizations/mine')
      .set('Authorization', `Bearer ${actor.token}`)
      .set(ORGANIZATION_ID_HEADER, foreign.organizationId)
      .expect(401);
  });

  it('aplica rol y baja local en la siguiente petición Clerk B2B', async () => {
    const actor = await fixture(UserRole.BARBER);

    await requestApp(app)
      .get('/organizations/mine')
      .set('Authorization', `Bearer ${actor.token}`)
      .set(ORGANIZATION_ID_HEADER, actor.organizationId)
      .expect(200);

    await prisma.db.membership.update({
      where: {
        userId_organizationId: {
          userId: actor.userId,
          organizationId: actor.organizationId,
        },
      },
      data: { role: UserRole.CUSTOMER },
    });
    await requestApp(app)
      .get('/organizations/mine')
      .set('Authorization', `Bearer ${actor.token}`)
      .set(ORGANIZATION_ID_HEADER, actor.organizationId)
      .expect(403);

    await prisma.db.membership.delete({
      where: {
        userId_organizationId: {
          userId: actor.userId,
          organizationId: actor.organizationId,
        },
      },
    });
    await requestApp(app)
      .get('/organizations/mine')
      .set('Authorization', `Bearer ${actor.token}`)
      .set(ORGANIZATION_ID_HEADER, actor.organizationId)
      .expect(401);
  });

  it('rechaza dos selectores tenant antes de verificar Clerk', async () => {
    const actor = await fixture(UserRole.OWNER);
    verifier.verify.mockClear();

    await expect(
      duplicateOrganizationHeader(app, actor.token, actor.organizationId),
    ).resolves.toBe(401);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('preserva GET /organizations/mine con JWT legacy y sin header nuevo', async () => {
    const key = unique('legacy');
    const email = `${key}@bootstrap.test`;
    const password = 'KortekA05Legacy!2026';
    await requestApp(app)
      .post('/auth/register')
      .send({
        name: 'Legacy Owner',
        email,
        password,
        organizationName: `Legacy ${key}`,
        organizationSlug: key,
        organizationEmail: `org-${key}@bootstrap.test`,
      })
      .expect(201);
    const login = await requestApp(app)
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    await requestApp(app)
      .get('/organizations/mine')
      .set('Authorization', `Bearer ${accessToken(login.body as unknown)}`)
      .expect(200);
  });
});
