import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaService } from '../src/prisma/prisma.service';
import { ClerkSessionVerifierService } from '../src/auth/clerk/clerk-session-verifier.service';
import { AuditService } from '../src/audit/audit.service';
import { createE2eApp, requestApp } from './create-e2e-app';

interface MockClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  primaryEmailAddressId: string;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification?: { status: string };
  }>;
}

interface OnboardingResponseBody {
  user?: {
    id: string;
    name: string;
    email: string;
    clerkUserId: string;
    lastOrganizationId: string;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
    email: string;
  };
  role?: string;
  message?: string | string[];
}

function toBody(res: { body: unknown }): OnboardingResponseBody {
  return res.body as OnboardingResponseBody;
}

describe('ClerkOnboarding (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let currentClerkUser: MockClerkUser | null = null;
  let shouldFailVerify = false;
  let currentSession = {
    clerkUserId: 'user_clerk_e2e_1',
    sessionId: 'sess_e2e_1',
  };
  const sessionsByToken = new Map<string, typeof currentSession>();
  const clerkUsersById = new Map<string, MockClerkUser>();
  const failingClerkUserIds = new Set<string>();

  const mockVerifier = {
    verify: jest.fn().mockImplementation((req?: globalThis.Request) => {
      if (shouldFailVerify) {
        return Promise.reject(new UnauthorizedException('Sesión no válida'));
      }
      const authHeader = req?.headers?.get('authorization');
      if (!authHeader || authHeader.trim().length === 0) {
        return Promise.reject(new UnauthorizedException('Sesión no válida'));
      }
      const token = authHeader.replace(/^Bearer\s+/i, '');
      return Promise.resolve(sessionsByToken.get(token) ?? currentSession);
    }),
    getClient: jest.fn().mockReturnValue({
      users: {
        getUser: jest.fn().mockImplementation((userId: string) => {
          if (failingClerkUserIds.has(userId)) {
            return Promise.reject(new Error('Clerk unavailable'));
          }
          const mappedUser = clerkUsersById.get(userId);
          if (mappedUser) {
            return Promise.resolve(mappedUser);
          }
          if (currentClerkUser && currentClerkUser.id === userId) {
            return Promise.resolve(currentClerkUser);
          }
          return Promise.resolve(currentClerkUser);
        }),
      },
    }),
  };

  const mockThrottlerGuard = {
    canActivate: () => true,
  };

  beforeAll(async () => {
    app = await createE2eApp((builder) =>
      builder
        .overrideProvider(ClerkSessionVerifierService)
        .useValue(mockVerifier)
        .overrideGuard(ThrottlerGuard)
        .useValue(mockThrottlerGuard),
    );
    prisma = app.get(PrismaService);
  });

  beforeEach(() => {
    shouldFailVerify = false;
    sessionsByToken.clear();
    clerkUsersById.clear();
    failingClerkUserIds.clear();
    currentSession = {
      clerkUserId: 'user_clerk_e2e_1',
      sessionId: 'sess_e2e_1',
    };
    currentClerkUser = {
      id: 'user_clerk_e2e_1',
      firstName: 'Carlos',
      lastName: 'Owner',
      username: 'carlosowner',
      primaryEmailAddressId: 'email_primary_1',
      emailAddresses: [
        {
          id: 'email_primary_1',
          emailAddress: 'carlos.owner@e2e-test.com',
          verification: { status: 'verified' },
        },
      ],
    };
  });

  afterAll(async () => {
    await app.close();
  });

  it('devuelve 401 si la petición no incluye cabecera Authorization', async () => {
    const res = await requestApp(app).post('/auth/clerk/onboarding').send({
      organizationName: 'Barbería Sin Auth',
      organizationSlug: 'barberia-sin-auth',
      organizationEmail: 'org-sin-auth@e2e-test.com',
    });

    expect(res.status).toBe(401);
  });

  it('devuelve 401 si la sesión de Clerk no es válida', async () => {
    shouldFailVerify = true;

    const res = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer invalid-token')
      .send({
        organizationName: 'Barbería E2E',
        organizationSlug: 'barberia-e2e-401',
        organizationEmail: 'org-401@e2e-test.com',
      });

    expect(res.status).toBe(401);
  });

  it('devuelve 400 si se envían campos prohibidos (ej. organizationId o role)', async () => {
    const res = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer valid-token')
      .send({
        organizationName: 'Barbería Invalida',
        organizationSlug: 'barberia-invalida',
        organizationEmail: 'org-invalida@e2e-test.com',
        organizationId: 'e1e2e3e4-e5e6-7e8e-9e0e-1e2e3e4e5e6e',
        role: 'OWNER',
      });

    expect(res.status).toBe(400);
  });

  it('devuelve 403 si el correo principal de Clerk no está verificado', async () => {
    currentClerkUser = {
      id: 'user_clerk_unverified',
      firstName: 'Unverified',
      lastName: 'User',
      username: null,
      primaryEmailAddressId: 'email_unverified',
      emailAddresses: [
        {
          id: 'email_unverified',
          emailAddress: 'unverified@e2e-test.com',
          verification: { status: 'unverified' },
        },
      ],
    };
    currentSession = {
      clerkUserId: 'user_clerk_unverified',
      sessionId: 'sess_unverified',
    };

    const res = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer valid-token')
      .send({
        organizationName: 'Barbería No Verificada',
        organizationSlug: 'barberia-no-verificada',
        organizationEmail: 'org-unverified@e2e-test.com',
      });

    expect(res.status).toBe(403);
  });

  it('devuelve 400 si el perfil de Clerk no tiene nombre ni username', async () => {
    currentClerkUser = {
      id: 'user_clerk_noname',
      firstName: null,
      lastName: null,
      username: null,
      primaryEmailAddressId: 'email_noname',
      emailAddresses: [
        {
          id: 'email_noname',
          emailAddress: 'noname@e2e-test.com',
          verification: { status: 'verified' },
        },
      ],
    };
    currentSession = {
      clerkUserId: 'user_clerk_noname',
      sessionId: 'sess_noname',
    };

    const res = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer valid-token')
      .send({
        organizationName: 'Barbería Sin Nombre',
        organizationSlug: 'barberia-sin-nombre',
        organizationEmail: 'org-noname@e2e-test.com',
      });

    expect(res.status).toBe(400);
  });

  it('devuelve 503 genérico y no persiste ninguna fila si Clerk.users.getUser falla', async () => {
    const unique = Date.now() + Math.random().toString(36).substring(2, 7);
    const clerkId = `user_clerk_unavailable_${unique}`;
    const token = `token-unavailable-${unique}`;
    sessionsByToken.set(token, {
      clerkUserId: clerkId,
      sessionId: `sess_unavailable_${unique}`,
    });
    failingClerkUserIds.add(clerkId);

    const before = {
      users: await prisma.db.user.count(),
      organizations: await prisma.db.organization.count(),
      memberships: await prisma.db.membership.count(),
      auditLogs: await prisma.db.auditLog.count(),
    };

    const res = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({
        organizationName: 'Barbería Clerk No Disponible',
        organizationSlug: `clerk-unavailable-${unique}`,
        organizationEmail: `org-${unique}@clerk-unavailable.test`,
      });

    expect(res.status).toBe(503);
    expect(res.body as unknown).toEqual({
      message: 'Servicio de autenticación no disponible temporalmente',
      error: 'Service Unavailable',
      statusCode: 503,
    });

    const after = {
      users: await prisma.db.user.count(),
      organizations: await prisma.db.organization.count(),
      memberships: await prisma.db.membership.count(),
      auditLogs: await prisma.db.auditLog.count(),
    };
    expect(after).toEqual(before);
  });

  it('crea exitosamente User(password null) + Organization + Membership(OWNER) con 201 Created', async () => {
    const unique = Date.now() + Math.random().toString(36).substring(2, 7);
    const slug = `barberia-exito-${unique}`;
    const orgEmail = `contacto-${unique}@e2e-exito.com`;
    const userEmail = `mateo-${unique}@e2e-test.com`;
    const clerkId = `user_clerk_success_${unique}`;

    currentSession = {
      clerkUserId: clerkId,
      sessionId: `sess_success_${unique}`,
    };
    currentClerkUser = {
      id: clerkId,
      firstName: 'Mateo',
      lastName: 'Barber',
      username: `mateobarber_${unique}`,
      primaryEmailAddressId: `email_${unique}`,
      emailAddresses: [
        {
          id: `email_${unique}`,
          emailAddress: userEmail,
          verification: { status: 'verified' },
        },
      ],
    };

    const res = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer valid-token')
      .send({
        organizationName: 'Barbería Éxito E2E',
        organizationSlug: slug.toUpperCase(), // En mayúsculas para comprobar normalización
        organizationEmail: orgEmail,
      });

    expect(res.status).toBe(201);
    const body = toBody(res);
    expect(body.user?.clerkUserId).toBe(clerkId);
    expect(body.user?.email).toBe(userEmail);
    expect(body.user?.name).toBe('Mateo Barber');
    expect(body.organization?.slug).toBe(slug);
    expect(body.role).toBe('OWNER');

    // Verificación directa en base de datos PostgreSQL aislada
    const dbUser = await prisma.db.user.findUnique({
      where: { clerkUserId: clerkId },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    expect(dbUser).not.toBeNull();
    expect(dbUser?.password).toBeNull();
    expect(dbUser?.memberships).toHaveLength(1);
    expect(dbUser?.memberships[0].role).toBe('OWNER');
    expect(dbUser?.memberships[0].organization.slug).toBe(slug);

    const auditLogs = await prisma.db.auditLog.findMany({
      where: {
        organizationId: dbUser?.memberships[0].organizationId,
        action: 'CREATE',
        entity: 'Organization',
      },
    });
    expect(auditLogs).toHaveLength(1);
  });

  it('retorna 200 OK de forma idempotente ante una segunda llamada con el mismo clerkUserId', async () => {
    const unique = Date.now() + Math.random().toString(36).substring(2, 7);
    const clerkId = `user_clerk_idemp_${unique}`;
    const slug = `barberia-idemp-${unique}`;
    const orgEmail = `contacto-${unique}@e2e-idempotent.com`;
    const userEmail = `lucas-${unique}@e2e-test.com`;

    currentSession = {
      clerkUserId: clerkId,
      sessionId: `sess_idemp_${unique}`,
    };
    currentClerkUser = {
      id: clerkId,
      firstName: 'Lucas',
      lastName: 'Owner',
      username: `lucasowner_${unique}`,
      primaryEmailAddressId: `email_${unique}`,
      emailAddresses: [
        {
          id: `email_${unique}`,
          emailAddress: userEmail,
          verification: { status: 'verified' },
        },
      ],
    };

    // Primera llamada -> 201
    const res1 = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer valid-token')
      .send({
        organizationName: 'Barbería Idempotente',
        organizationSlug: slug,
        organizationEmail: orgEmail,
      });

    expect(res1.status).toBe(201);
    const orgId = toBody(res1).organization?.id;

    // Segunda llamada -> 200 idempotente con mismos IDs
    const res2 = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer valid-token')
      .send({
        organizationName: 'Barbería Idempotente Intento 2',
        organizationSlug: `otro-slug-${unique}`,
        organizationEmail: `otro-${unique}@email.com`,
      });

    expect(res2.status).toBe(200);
    const body2 = toBody(res2);
    expect(body2.organization?.id).toBe(orgId);
    expect(body2.organization?.slug).toBe(slug);

    // Comprobar que no se duplicaron organizaciones ni usuarios
    const usersCount = await prisma.db.user.count({
      where: { clerkUserId: clerkId },
    });
    expect(usersCount).toBe(1);
  });

  it('soporta concurrencia Promise.all con mismo clerkUserId creando exactamente 1 User, 1 Organization, 1 Membership OWNER y 1 AuditLog', async () => {
    const unique = Date.now() + Math.random().toString(36).substring(2, 7);
    const clerkId = `user_clerk_concurrent_${unique}`;
    const slug = `barberia-concurrent-${unique}`;
    const orgEmail = `contacto-${unique}@concurrent.com`;
    const userEmail = `concurrent-${unique}@e2e-test.com`;

    currentSession = {
      clerkUserId: clerkId,
      sessionId: `sess_concurrent_${unique}`,
    };
    currentClerkUser = {
      id: clerkId,
      firstName: 'Concurrent',
      lastName: 'Owner',
      username: `concurrent_${unique}`,
      primaryEmailAddressId: `email_${unique}`,
      emailAddresses: [
        {
          id: `email_${unique}`,
          emailAddress: userEmail,
          verification: { status: 'verified' },
        },
      ],
    };

    const payload = {
      organizationName: 'Barbería Concurrente',
      organizationSlug: slug,
      organizationEmail: orgEmail,
    };

    const [res1, res2] = await Promise.all([
      requestApp(app)
        .post('/auth/clerk/onboarding')
        .set('Authorization', 'Bearer valid-token')
        .send(payload),
      requestApp(app)
        .post('/auth/clerk/onboarding')
        .set('Authorization', 'Bearer valid-token')
        .send(payload),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 201]);

    // Verificar en PostgreSQL real aislado
    const users = await prisma.db.user.findMany({
      where: { clerkUserId: clerkId },
    });
    expect(users).toHaveLength(1);
    expect(users[0].password).toBeNull();

    const orgs = await prisma.db.organization.findMany({
      where: { slug },
    });
    expect(orgs).toHaveLength(1);

    const memberships = await prisma.db.membership.findMany({
      where: {
        userId: users[0].id,
        organizationId: orgs[0].id,
      },
    });
    expect(memberships).toHaveLength(1);
    expect(memberships[0].role).toBe('OWNER');

    const auditLogs = await prisma.db.auditLog.findMany({
      where: {
        organizationId: orgs[0].id,
        action: 'CREATE',
        entity: 'Organization',
      },
    });
    expect(auditLogs).toHaveLength(1);
  });

  it('serializa dos clerkUserId distintos con el mismo slug sin dejar filas parciales', async () => {
    const unique = Date.now() + Math.random().toString(36).substring(2, 7);
    const sharedSlug = `shared-concurrent-slug-${unique}`;
    const clerkIds = [
      `user_clerk_slug_race_a_${unique}`,
      `user_clerk_slug_race_b_${unique}`,
    ] as const;
    const tokens = [`slug-race-a-${unique}`, `slug-race-b-${unique}`] as const;

    clerkIds.forEach((clerkUserId, index) => {
      sessionsByToken.set(tokens[index], {
        clerkUserId,
        sessionId: `sess_slug_race_${index}_${unique}`,
      });
      clerkUsersById.set(clerkUserId, {
        id: clerkUserId,
        firstName: 'Slug',
        lastName: index === 0 ? 'Alpha' : 'Beta',
        username: null,
        primaryEmailAddressId: `email_slug_race_${index}_${unique}`,
        emailAddresses: [
          {
            id: `email_slug_race_${index}_${unique}`,
            emailAddress: `slug-race-${index}-${unique}@e2e-test.com`,
            verification: { status: 'verified' },
          },
        ],
      });
    });

    const before = {
      users: await prisma.db.user.count(),
      organizations: await prisma.db.organization.count(),
      memberships: await prisma.db.membership.count(),
      auditLogs: await prisma.db.auditLog.count(),
    };

    const responses = await Promise.all(
      tokens.map((token, index) =>
        requestApp(app)
          .post('/auth/clerk/onboarding')
          .set('Authorization', `Bearer ${token}`)
          .send({
            organizationName: `Barbería Slug Race ${index + 1}`,
            organizationSlug: sharedSlug,
            organizationEmail: `slug-race-org-${index}-${unique}@e2e-test.com`,
          }),
      ),
    );

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);

    const winningResponse = responses.find(({ status }) => status === 201);
    if (!winningResponse) {
      throw new Error('No se encontró la respuesta 201 esperada.');
    }
    const winnerClerkId = toBody(winningResponse).user?.clerkUserId;
    if (!winnerClerkId) {
      throw new Error('La respuesta 201 no incluyó el clerkUserId esperado.');
    }
    expect(clerkIds).toContain(winnerClerkId);
    const loserClerkId =
      winnerClerkId === clerkIds[0] ? clerkIds[1] : clerkIds[0];

    const organizations = await prisma.db.organization.findMany({
      where: { slug: sharedSlug },
    });
    expect(organizations).toHaveLength(1);

    const winningUser = await prisma.db.user.findUnique({
      where: { clerkUserId: winnerClerkId },
    });
    const losingUser = await prisma.db.user.findUnique({
      where: { clerkUserId: loserClerkId },
    });
    expect(winningUser).not.toBeNull();
    expect(losingUser).toBeNull();

    const memberships = await prisma.db.membership.findMany({
      where: { organizationId: organizations[0].id },
    });
    expect(memberships).toHaveLength(1);
    expect(memberships[0].userId).toBe(winningUser?.id);

    const auditLogs = await prisma.db.auditLog.findMany({
      where: { organizationId: organizations[0].id },
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]).toMatchObject({
      userId: winningUser?.id,
      action: 'CREATE',
      entity: 'Organization',
      entityId: organizations[0].id,
    });

    const after = {
      users: await prisma.db.user.count(),
      organizations: await prisma.db.organization.count(),
      memberships: await prisma.db.membership.count(),
      auditLogs: await prisma.db.auditLog.count(),
    };
    expect(after).toEqual({
      users: before.users + 1,
      organizations: before.organizations + 1,
      memberships: before.memberships + 1,
      auditLogs: before.auditLogs + 1,
    });
  });

  it('devuelve 409 ante estado parcial (clerkUserId existe sin membresía OWNER) y nunca crea segunda organización', async () => {
    const unique = Date.now() + Math.random().toString(36).substring(2, 7);
    const clerkId = `user_clerk_partial_${unique}`;
    const userEmail = `partial-${unique}@e2e-test.com`;

    // Insertamos directamente un usuario con clerkUserId pero sin memberships
    await prisma.db.user.create({
      data: {
        name: 'Partial User',
        email: userEmail,
        password: null,
        clerkUserId: clerkId,
      },
    });

    currentSession = {
      clerkUserId: clerkId,
      sessionId: `sess_partial_${unique}`,
    };
    currentClerkUser = {
      id: clerkId,
      firstName: 'Partial',
      lastName: 'User',
      username: `partial_${unique}`,
      primaryEmailAddressId: `email_${unique}`,
      emailAddresses: [
        {
          id: `email_${unique}`,
          emailAddress: userEmail,
          verification: { status: 'verified' },
        },
      ],
    };

    const targetSlug = `barberia-no-creada-${unique}`;

    const res = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer valid-token')
      .send({
        organizationName: 'Barbería No Creada',
        organizationSlug: targetSlug,
        organizationEmail: `contacto-${unique}@no-creada.com`,
      });

    expect(res.status).toBe(409);
    expect(String(toBody(res).message)).toContain(
      'Estado de cuenta no válido para onboarding',
    );

    const createdOrg = await prisma.db.organization.findUnique({
      where: { slug: targetSlug },
    });
    expect(createdOrg).toBeNull();
  });

  it('devuelve 409 ante colisión de organizationEmail entre dos organizaciones', async () => {
    const unique = Date.now() + Math.random().toString(36).substring(2, 7);
    const sharedEmail = `correo-compartido-${unique}@e2e-test.com`;

    // Crear primera organización exitosamente
    const clerk1 = `user_clerk_email_col_1_${unique}`;
    currentSession = { clerkUserId: clerk1, sessionId: `sess_1_${unique}` };
    currentClerkUser = {
      id: clerk1,
      firstName: 'Owner',
      lastName: 'One',
      username: null,
      primaryEmailAddressId: `e1_${unique}`,
      emailAddresses: [
        {
          id: `e1_${unique}`,
          emailAddress: `owner1-${unique}@e2e-test.com`,
          verification: { status: 'verified' },
        },
      ],
    };

    const res1 = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer valid-token')
      .send({
        organizationName: 'Org Uno',
        organizationSlug: `org-uno-email-col-${unique}`,
        organizationEmail: sharedEmail,
      });
    expect(res1.status).toBe(201);

    // Intentar crear segunda organización con el mismo correo de organización
    const clerk2 = `user_clerk_email_col_2_${unique}`;
    currentSession = { clerkUserId: clerk2, sessionId: `sess_2_${unique}` };
    currentClerkUser = {
      id: clerk2,
      firstName: 'Owner',
      lastName: 'Two',
      username: null,
      primaryEmailAddressId: `e2_${unique}`,
      emailAddresses: [
        {
          id: `e2_${unique}`,
          emailAddress: `owner2-${unique}@e2e-test.com`,
          verification: { status: 'verified' },
        },
      ],
    };

    const res2 = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer valid-token')
      .send({
        organizationName: 'Org Dos',
        organizationSlug: `org-dos-email-col-${unique}`,
        organizationEmail: sharedEmail,
      });

    expect(res2.status).toBe(409);
    expect(String(toBody(res2).message)).toContain(
      'Ya existe una organización registrada con este correo',
    );
  });

  it('devuelve 409 ante colisión de slug de organización', async () => {
    const unique = Date.now() + Math.random().toString(36).substring(2, 7);
    const sharedSlug = `slug-compartido-${unique}`;

    const clerk1 = `user_clerk_slug_col_1_${unique}`;
    currentSession = { clerkUserId: clerk1, sessionId: `sess_1_${unique}` };
    currentClerkUser = {
      id: clerk1,
      firstName: 'Slug',
      lastName: 'One',
      username: null,
      primaryEmailAddressId: `e1_${unique}`,
      emailAddresses: [
        {
          id: `e1_${unique}`,
          emailAddress: `slug1-${unique}@e2e-test.com`,
          verification: { status: 'verified' },
        },
      ],
    };

    const res1 = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer valid-token')
      .send({
        organizationName: 'Org Slug 1',
        organizationSlug: sharedSlug,
        organizationEmail: `org-slug-1-${unique}@e2e-test.com`,
      });
    expect(res1.status).toBe(201);

    const clerk2 = `user_clerk_slug_col_2_${unique}`;
    currentSession = { clerkUserId: clerk2, sessionId: `sess_2_${unique}` };
    currentClerkUser = {
      id: clerk2,
      firstName: 'Slug',
      lastName: 'Two',
      username: null,
      primaryEmailAddressId: `e2_${unique}`,
      emailAddresses: [
        {
          id: `e2_${unique}`,
          emailAddress: `slug2-${unique}@e2e-test.com`,
          verification: { status: 'verified' },
        },
      ],
    };

    const res2 = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer valid-token')
      .send({
        organizationName: 'Org Slug 2',
        organizationSlug: sharedSlug,
        organizationEmail: `org-slug-2-${unique}@e2e-test.com`,
      });

    expect(res2.status).toBe(409);
    expect(String(toBody(res2).message)).toContain(
      'El slug de la organización ya está en uso',
    );
  });

  it('devuelve 409 neutro ante colisión de correo verificado con usuario local no enlazado (anti-enlace)', async () => {
    const unique = Date.now() + Math.random().toString(36).substring(2, 7);
    const localEmail = `local-unlinked-${unique}@e2e-test.com`;

    // Insertar un usuario local preexistente sin enlace a Clerk
    await prisma.db.user.create({
      data: {
        name: 'Usuario Local Preexistente',
        email: localEmail,
        password: 'hashed-password-123',
        clerkUserId: null,
      },
    });

    const clerkId = `user_clerk_takeover_${unique}`;
    const securityEventsBefore = await prisma.db.auditLog.count({
      where: { action: 'CLERK_ONBOARDING_EMAIL_CONFLICT' },
    });
    currentSession = {
      clerkUserId: clerkId,
      sessionId: `sess_takeover_${unique}`,
    };
    currentClerkUser = {
      id: clerkId,
      firstName: 'Attacker',
      lastName: 'Owner',
      username: null,
      primaryEmailAddressId: `e_takeover_${unique}`,
      emailAddresses: [
        {
          id: `e_takeover_${unique}`,
          emailAddress: localEmail,
          verification: { status: 'verified' },
        },
      ],
    };

    const res = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer valid-token')
      .send({
        organizationName: 'Barbería Takeover',
        organizationSlug: `barberia-takeover-${unique}`,
        organizationEmail: `contacto-${unique}@takeover.com`,
      });

    expect(res.status).toBe(409);
    expect(toBody(res).message).toBe(
      'No es posible completar el registro con los datos proporcionados.',
    );
    expect(res.body as unknown).toEqual({
      message:
        'No es posible completar el registro con los datos proporcionados.',
      error: 'Conflict',
      statusCode: 409,
    });

    // Verificar que el usuario local NO fue sobreescrito ni enlazado
    const dbUser = await prisma.db.user.findUnique({
      where: { email: localEmail },
    });
    expect(dbUser?.clerkUserId).toBeNull();

    const securityEventsAfter = await prisma.db.auditLog.count({
      where: { action: 'CLERK_ONBOARDING_EMAIL_CONFLICT' },
    });
    expect(securityEventsAfter).toBe(securityEventsBefore + 1);

    const securityEvent = await prisma.db.auditLog.findFirst({
      where: { action: 'CLERK_ONBOARDING_EMAIL_CONFLICT' },
      orderBy: { createdAt: 'desc' },
    });
    expect(securityEvent).toMatchObject({
      organizationId: null,
      userId: null,
      action: 'CLERK_ONBOARDING_EMAIL_CONFLICT',
      entity: 'SecurityEvent',
      entityId: null,
    });
    expect(JSON.stringify(securityEvent)).not.toContain(localEmail);
    expect(JSON.stringify(res.body)).not.toContain(clerkId);
  });
});

describe('ClerkOnboarding rollback on audit failure (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let currentClerkUser: MockClerkUser | null = null;
  const currentSession = {
    clerkUserId: 'user_clerk_rollback_1',
    sessionId: 'sess_rollback_1',
  };

  const mockVerifier = {
    verify: jest.fn().mockImplementation((req?: globalThis.Request) => {
      const authHeader = req?.headers?.get('authorization');
      if (!authHeader) {
        return Promise.reject(new UnauthorizedException('Sesión no válida'));
      }
      return Promise.resolve(currentSession);
    }),
    getClient: jest.fn().mockReturnValue({
      users: {
        getUser: jest.fn().mockImplementation((userId: string) => {
          if (currentClerkUser && currentClerkUser.id === userId) {
            return Promise.resolve(currentClerkUser);
          }
          return Promise.resolve(currentClerkUser);
        }),
      },
    }),
  };

  beforeAll(async () => {
    app = await createE2eApp((builder) =>
      builder
        .overrideProvider(ClerkSessionVerifierService)
        .useValue(mockVerifier)
        .overrideGuard(ThrottlerGuard)
        .useValue({ canActivate: () => true })
        .overrideProvider(AuditService)
        .useValue({
          log: jest.fn().mockResolvedValue(undefined),
          logTransactional: jest
            .fn()
            .mockRejectedValue(new Error('forced audit failure')),
        }),
    );
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('provoca rollback total en PostgreSQL si falla logTransactional', async () => {
    const unique = Date.now() + Math.random().toString(36).substring(2, 7);
    const clerkId = `user_clerk_auditfail_${unique}`;
    const slug = `barberia-auditfail-${unique}`;
    const orgEmail = `contacto-${unique}@auditfail.com`;
    const userEmail = `auditfail-${unique}@e2e-test.com`;

    currentClerkUser = {
      id: clerkId,
      firstName: 'Audit',
      lastName: 'Fail',
      username: `auditfail_${unique}`,
      primaryEmailAddressId: `email_${unique}`,
      emailAddresses: [
        {
          id: `email_${unique}`,
          emailAddress: userEmail,
          verification: { status: 'verified' },
        },
      ],
    };
    currentSession.clerkUserId = clerkId;

    const initialAuditCount = await prisma.db.auditLog.count();

    const res = await requestApp(app)
      .post('/auth/clerk/onboarding')
      .set('Authorization', 'Bearer valid-token')
      .send({
        organizationName: 'Barbería Audit Fail',
        organizationSlug: slug,
        organizationEmail: orgEmail,
      });

    expect(res.status).toBeGreaterThanOrEqual(500);

    // Verificar explícitamente que no existe User por clerkUserId
    const user = await prisma.db.user.findUnique({
      where: { clerkUserId: clerkId },
    });
    expect(user).toBeNull();

    // Verificar explícitamente que no existe Organization por slug
    const org = await prisma.db.organization.findUnique({
      where: { slug },
    });
    expect(org).toBeNull();

    // Verificar explícitamente que no existe Membership asociada al usuario u organización de la prueba
    const membershipsByUser = await prisma.db.membership.findMany({
      where: {
        user: { clerkUserId: clerkId },
      },
    });
    expect(membershipsByUser).toHaveLength(0);

    const membershipsByOrg = await prisma.db.membership.findMany({
      where: {
        organization: { slug },
      },
    });
    expect(membershipsByOrg).toHaveLength(0);

    // Confirmar que el conteo de AuditLog no cambió
    const finalAuditCount = await prisma.db.auditLog.count();
    expect(finalAuditCount).toBe(initialAuditCount);
  });
});
