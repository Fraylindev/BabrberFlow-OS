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

function readAccessToken(body: unknown): string {
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

function requestWithDuplicateOrganizationHeader(
  app: INestApplication,
  token: string,
  organizationId: string,
): Promise<{ status: number; body: unknown }> {
  const server = app.getHttpServer() as Server;
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('El servidor E2E no tiene un puerto TCP disponible.');
  }

  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: address.address,
        port: address.port,
        path: '/auth/clerk/me',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          [ORGANIZATION_ID_HEADER]: [organizationId, organizationId],
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: response.statusCode ?? 0,
            body: rawBody ? (JSON.parse(rawBody) as unknown) : undefined,
          });
        });
      },
    );
    request.on('error', reject);
    request.end();
  });
}

describe('GET /auth/clerk/me (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sequence = 0;
  const sessionsByToken = new Map<string, string>();

  const mockVerifier = {
    verify: jest.fn().mockImplementation((request?: globalThis.Request) => {
      const authorization = request?.headers.get('authorization');
      const token = authorization?.replace(/^Bearer\s+/i, '');
      const clerkUserId = token ? sessionsByToken.get(token) : undefined;

      if (!clerkUserId) {
        return Promise.reject(
          new UnauthorizedException('Sesión no válida para esta organización'),
        );
      }

      return Promise.resolve({
        clerkUserId,
        sessionId: `session-${clerkUserId}`,
      });
    }),
  };

  beforeAll(async () => {
    app = await createE2eApp((builder) =>
      builder
        .overrideProvider(ClerkSessionVerifierService)
        .useValue(mockVerifier)
        .overrideGuard(ThrottlerGuard)
        .useValue({ canActivate: () => true }),
    );
    prisma = app.get(PrismaService);
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app.close();
  });

  async function createFixture(role: UserRole): Promise<Fixture> {
    sequence += 1;
    const unique = `${Date.now()}-${sequence}`;
    const clerkUserId = `user_clerk_me_${role.toLowerCase()}_${unique}`;
    const token = `token-clerk-me-${role.toLowerCase()}-${unique}`;
    const organization = await prisma.db.organization.create({
      data: {
        name: `Organización Clerk Me ${role} ${unique}`,
        slug: `clerk-me-${role.toLowerCase()}-${unique}`,
        email: `org-${role.toLowerCase()}-${unique}@clerk-me.test`,
      },
    });
    const user = await prisma.db.user.create({
      data: {
        name: `Usuario ${role}`,
        email: `user-${role.toLowerCase()}-${unique}@clerk-me.test`,
        password: null,
        clerkUserId,
        lastOrganizationId: organization.id,
      },
    });
    await prisma.db.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role,
      },
    });
    sessionsByToken.set(token, clerkUserId);

    return {
      organizationId: organization.id,
      userId: user.id,
      token,
    };
  }

  it.each([
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.BARBER,
  ])('permite a %s consultar únicamente su organización', async (role) => {
    const fixture = await createFixture(role);

    const response = await requestApp(app)
      .get('/auth/clerk/me')
      .set('Authorization', `Bearer ${fixture.token}`)
      .set(ORGANIZATION_ID_HEADER, fixture.organizationId);

    expect(response.status).toBe(200);
    expect(response.body as unknown).toMatchObject({
      id: fixture.organizationId,
    });
  });

  it('devuelve exactamente la misma respuesta que GET /organizations/mine sin cambiar el flujo JWT legacy', async () => {
    sequence += 1;
    const unique = `${Date.now()}-${sequence}`;
    const email = `legacy-parity-${unique}@clerk-me.test`;
    const password = 'KortekParity!2026';
    const slug = `legacy-parity-${unique}`;

    await requestApp(app)
      .post('/auth/register')
      .send({
        name: 'Owner Parity',
        email,
        password,
        organizationName: `Organización Parity ${unique}`,
        organizationSlug: slug,
        organizationEmail: `org-parity-${unique}@clerk-me.test`,
      })
      .expect(201);

    const user = await prisma.db.user.findUniqueOrThrow({ where: { email } });
    const organization = await prisma.db.organization.findUniqueOrThrow({
      where: { slug },
    });
    const clerkUserId = `user_clerk_parity_${unique}`;
    const clerkToken = `token-clerk-parity-${unique}`;
    await prisma.db.user.update({
      where: { id: user.id },
      data: { clerkUserId },
    });
    sessionsByToken.set(clerkToken, clerkUserId);

    const login = await requestApp(app)
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    const legacyToken = readAccessToken(login.body as unknown);

    const legacyResponse = await requestApp(app)
      .get('/organizations/mine')
      .set('Authorization', `Bearer ${legacyToken}`)
      .expect(200);
    const clerkResponse = await requestApp(app)
      .get('/auth/clerk/me')
      .set('Authorization', `Bearer ${clerkToken}`)
      .set(ORGANIZATION_ID_HEADER, organization.id)
      .expect(200);

    expect(clerkResponse.body as unknown).toEqual(
      legacyResponse.body as unknown,
    );
  });

  it('rechaza un x-organization-id duplicado aunque ambos valores sean idénticos', async () => {
    const fixture = await createFixture(UserRole.OWNER);
    mockVerifier.verify.mockClear();

    const response = await requestWithDuplicateOrganizationHeader(
      app,
      fixture.token,
      fixture.organizationId,
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: 'Sesión no válida para esta organización',
      error: 'Unauthorized',
      statusCode: 401,
    });
    expect(mockVerifier.verify).not.toHaveBeenCalled();
  });

  it.each([
    ['ausente', undefined],
    ['inválido', 'not-a-uuid'],
  ])(
    'rechaza un selector %s antes de verificar Clerk',
    async (_case, value) => {
      const fixture = await createFixture(UserRole.OWNER);
      mockVerifier.verify.mockClear();
      let request = requestApp(app)
        .get('/auth/clerk/me')
        .set('Authorization', `Bearer ${fixture.token}`);
      if (value) {
        request = request.set(ORGANIZATION_ID_HEADER, value);
      }

      const response = await request;

      expect(response.status).toBe(401);
      expect(mockVerifier.verify).not.toHaveBeenCalled();
    },
  );

  it('no trata el selector como autoridad y rechaza una organización ajena', async () => {
    const actor = await createFixture(UserRole.ADMIN);
    const foreign = await createFixture(UserRole.OWNER);

    const response = await requestApp(app)
      .get('/auth/clerk/me')
      .set('Authorization', `Bearer ${actor.token}`)
      .set(ORGANIZATION_ID_HEADER, foreign.organizationId);

    expect(response.status).toBe(401);
    expect(response.body as unknown).toEqual({
      message: 'Sesión no válida para esta organización',
      error: 'Unauthorized',
      statusCode: 401,
    });
  });

  it('rechaza una identidad Clerk sin User local enlazado y un User sin Membership', async () => {
    sequence += 1;
    const unique = `${Date.now()}-${sequence}`;
    const target = await createFixture(UserRole.OWNER);
    const missingUserToken = `token-missing-user-${unique}`;
    sessionsByToken.set(missingUserToken, `user_clerk_missing_local_${unique}`);

    await requestApp(app)
      .get('/auth/clerk/me')
      .set('Authorization', `Bearer ${missingUserToken}`)
      .set(ORGANIZATION_ID_HEADER, target.organizationId)
      .expect(401);

    const clerkUserId = `user_clerk_without_membership_${unique}`;
    await prisma.db.user.create({
      data: {
        name: 'Sin Membership',
        email: `without-membership-${unique}@clerk-me.test`,
        password: null,
        clerkUserId,
      },
    });
    const noMembershipToken = `token-without-membership-${unique}`;
    sessionsByToken.set(noMembershipToken, clerkUserId);

    await requestApp(app)
      .get('/auth/clerk/me')
      .set('Authorization', `Bearer ${noMembershipToken}`)
      .set(ORGANIZATION_ID_HEADER, target.organizationId)
      .expect(401);
  });

  it('rechaza CUSTOMER y no confía en headers de rol controlados por el cliente', async () => {
    const fixture = await createFixture(UserRole.CUSTOMER);

    const response = await requestApp(app)
      .get('/auth/clerk/me')
      .set('Authorization', `Bearer ${fixture.token}`)
      .set(ORGANIZATION_ID_HEADER, fixture.organizationId)
      .set('x-role', UserRole.OWNER);

    expect(response.status).toBe(403);
  });

  it('aplica cambio de rol y baja de Membership en la petición siguiente', async () => {
    const fixture = await createFixture(UserRole.BARBER);

    await requestApp(app)
      .get('/auth/clerk/me')
      .set('Authorization', `Bearer ${fixture.token}`)
      .set(ORGANIZATION_ID_HEADER, fixture.organizationId)
      .expect(200);

    await prisma.db.membership.update({
      where: {
        userId_organizationId: {
          userId: fixture.userId,
          organizationId: fixture.organizationId,
        },
      },
      data: { role: UserRole.CUSTOMER },
    });
    await requestApp(app)
      .get('/auth/clerk/me')
      .set('Authorization', `Bearer ${fixture.token}`)
      .set(ORGANIZATION_ID_HEADER, fixture.organizationId)
      .expect(403);

    await prisma.db.membership.delete({
      where: {
        userId_organizationId: {
          userId: fixture.userId,
          organizationId: fixture.organizationId,
        },
      },
    });
    await requestApp(app)
      .get('/auth/clerk/me')
      .set('Authorization', `Bearer ${fixture.token}`)
      .set(ORGANIZATION_ID_HEADER, fixture.organizationId)
      .expect(401);
  });

  it('rechaza una sesión desconocida o revocada con respuesta genérica', async () => {
    const fixture = await createFixture(UserRole.OWNER);

    const response = await requestApp(app)
      .get('/auth/clerk/me')
      .set('Authorization', 'Bearer revoked-session-token')
      .set(ORGANIZATION_ID_HEADER, fixture.organizationId);

    expect(response.status).toBe(401);
    expect(response.body as unknown).toEqual({
      message: 'Sesión no válida para esta organización',
      error: 'Unauthorized',
      statusCode: 401,
    });
  });
});
