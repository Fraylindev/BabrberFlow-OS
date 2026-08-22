import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TeamInvitationStatus, UserRole, type User } from '@prisma/client';
import { ClerkSessionVerifierService } from '../src/auth/clerk/clerk-session-verifier.service';
import { CLERK_INVITATION_REDIRECT_URL } from '../src/auth/clerk/clerk-auth.providers';
import { ORGANIZATION_ID_HEADER } from '../src/auth/guards/clerk-auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, requestApp } from './create-e2e-app';

interface ActorFixture {
  organizationId: string;
  user: User;
  token: string;
}

interface ExternalInvitation {
  id: string;
  emailAddress: string;
  redirectUrl: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
}

interface ClerkProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: null;
  primaryEmailAddressId: string;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification: { status: 'verified' };
  }>;
}

describe('Security A0.4 team invitations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sequence = 0;
  let failGetUser = false;
  let failCreateInvitation = false;
  const sessions = new Map<string, string>();
  const profiles = new Map<string, ClerkProfile>();
  const externalInvitations = new Map<string, ExternalInvitation>();

  const clerkClient = {
    invitations: {
      createInvitation: jest.fn(
        ({
          emailAddress,
          redirectUrl,
        }: {
          emailAddress: string;
          redirectUrl: string;
        }) => {
          if (failCreateInvitation) {
            return Promise.reject(new Error('external unavailable'));
          }
          const id = `inv_a04_${Date.now()}_${++sequence}`;
          const invitation: ExternalInvitation = {
            id,
            emailAddress,
            redirectUrl,
            status: 'pending',
          };
          externalInvitations.set(id, invitation);
          return Promise.resolve(invitation);
        },
      ),
      revokeInvitation: jest.fn((invitationId: string) => {
        const invitation = externalInvitations.get(invitationId);
        if (!invitation) return Promise.reject(new Error('not found'));
        invitation.status = 'revoked';
        return Promise.resolve(invitation);
      }),
      getInvitationList: jest.fn(
        ({ query, status }: { query?: string; status?: string }) => {
          const data = [...externalInvitations.values()].filter(
            (invitation) =>
              (!query || invitation.id === query) &&
              (!status || invitation.status === status),
          );
          return Promise.resolve({ data, totalCount: data.length });
        },
      ),
    },
    users: {
      getUser: jest.fn((clerkUserId: string) => {
        if (failGetUser) return Promise.reject(new Error('unavailable'));
        const profile = profiles.get(clerkUserId);
        if (!profile) return Promise.reject(new Error('not found'));
        return Promise.resolve(profile);
      }),
    },
  };

  const mockVerifier = {
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
    getClient: jest.fn(() => clerkClient),
  };

  beforeAll(async () => {
    app = await createE2eApp((builder) =>
      builder
        .overrideProvider(ClerkSessionVerifierService)
        .useValue(mockVerifier)
        .overrideProvider(CLERK_INVITATION_REDIRECT_URL)
        .useValue(() => 'http://localhost:3001/accept-invitation')
        .overrideGuard(ThrottlerGuard)
        .useValue({ canActivate: () => true }),
    );
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    failGetUser = false;
    failCreateInvitation = false;
  });

  function unique(label: string): string {
    sequence += 1;
    return `${label}-${Date.now()}-${sequence}`;
  }

  function addProfile(clerkUserId: string, email: string): void {
    const emailId = `email_${unique('profile')}`;
    profiles.set(clerkUserId, {
      id: clerkUserId,
      firstName: 'Invitado',
      lastName: 'Kortek',
      username: null,
      primaryEmailAddressId: emailId,
      emailAddresses: [
        {
          id: emailId,
          emailAddress: email,
          verification: { status: 'verified' },
        },
      ],
    });
  }

  async function createActor(role: UserRole): Promise<ActorFixture> {
    const key = unique(role.toLowerCase());
    const organization = await prisma.db.organization.create({
      data: {
        name: `Organization ${key}`,
        slug: `org-${key}`,
        email: `org-${key}@a04.test`,
      },
    });
    const clerkUserId = `user_${key}`;
    const user = await prisma.db.user.create({
      data: {
        name: `Actor ${role}`,
        email: `actor-${key}@a04.test`,
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
    return { organizationId: organization.id, user, token };
  }

  async function createInvitation(
    actor: ActorFixture,
    email: string,
    role: UserRole = UserRole.BARBER,
    createPublicProfile = role === UserRole.BARBER,
  ) {
    const response = await requestApp(app)
      .post('/auth/clerk/invitations')
      .set('Authorization', `Bearer ${actor.token}`)
      .set(ORGANIZATION_ID_HEADER, actor.organizationId)
      .send({ email, role, createPublicProfile, expiresInDays: 30 });
    expect(response.status).toBe(201);
    return response.body as { id: string; email: string; status: string };
  }

  async function markAccepted(invitationId: string): Promise<void> {
    const local = await prisma.db.teamInvitation.findUniqueOrThrow({
      where: { id: invitationId },
    });
    const external = externalInvitations.get(local.clerkInvitationId ?? '');
    if (!external) throw new Error('External invitation missing');
    external.status = 'accepted';
  }

  it('permite gestionar solo a OWNER/ADMIN, rechaza OWNER invitado y aísla listados por tenant', async () => {
    const owner = await createActor(UserRole.OWNER);
    const admin = await createActor(UserRole.ADMIN);
    const receptionist = await createActor(UserRole.RECEPTIONIST);
    const barber = await createActor(UserRole.BARBER);
    const email = `  Mixed-${unique('email')}@Example.Test  `;

    const invitation = await createInvitation(owner, email);
    expect(invitation.email).toBe(email.trim().toLowerCase());
    expect(invitation.status).toBe(TeamInvitationStatus.PENDING);
    const createdLocal = await prisma.db.teamInvitation.findUniqueOrThrow({
      where: { id: invitation.id },
    });
    const createdExternal = externalInvitations.get(
      createdLocal.clerkInvitationId ?? '',
    );
    expect(createdExternal?.redirectUrl).toBe(
      `http://localhost:3001/accept-invitation?invitation=${invitation.id}`,
    );

    const ownerList = await requestApp(app)
      .get('/auth/clerk/invitations?page=1&limit=20')
      .set('Authorization', `Bearer ${owner.token}`)
      .set(ORGANIZATION_ID_HEADER, owner.organizationId)
      .expect(200);
    const ownerListBody = ownerList.body as unknown as {
      items: Array<{ id: string }>;
    };
    expect(ownerListBody.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: invitation.id })]),
    );

    const adminList = await requestApp(app)
      .get('/auth/clerk/invitations')
      .set('Authorization', `Bearer ${admin.token}`)
      .set(ORGANIZATION_ID_HEADER, admin.organizationId)
      .expect(200);
    const adminListBody = adminList.body as unknown as {
      items: Array<{ id: string }>;
    };
    expect(adminListBody.items).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: invitation.id })]),
    );

    for (const denied of [receptionist, barber]) {
      await requestApp(app)
        .post('/auth/clerk/invitations')
        .set('Authorization', `Bearer ${denied.token}`)
        .set(ORGANIZATION_ID_HEADER, denied.organizationId)
        .send({
          email: `${unique('denied')}@a04.test`,
          role: UserRole.BARBER,
        })
        .expect(403);
    }

    await requestApp(app)
      .post('/auth/clerk/invitations')
      .set('Authorization', `Bearer ${owner.token}`)
      .set(ORGANIZATION_ID_HEADER, owner.organizationId)
      .send({ email: `${unique('owner')}@a04.test`, role: UserRole.OWNER })
      .expect(400);
  });

  it('reenvía, revoca e impide duplicados abiertos por organización/correo', async () => {
    const admin = await createActor(UserRole.ADMIN);
    const email = `${unique('lifecycle')}@a04.test`;
    const invitation = await createInvitation(
      admin,
      email,
      UserRole.ADMIN,
      false,
    );
    const original = await prisma.db.teamInvitation.findUniqueOrThrow({
      where: { id: invitation.id },
    });

    await requestApp(app)
      .post('/auth/clerk/invitations')
      .set('Authorization', `Bearer ${admin.token}`)
      .set(ORGANIZATION_ID_HEADER, admin.organizationId)
      .send({ email, role: UserRole.ADMIN })
      .expect(409);

    const resent = await requestApp(app)
      .post(`/auth/clerk/invitations/${invitation.id}/resend`)
      .set('Authorization', `Bearer ${admin.token}`)
      .set(ORGANIZATION_ID_HEADER, admin.organizationId)
      .expect(200);
    expect((resent.body as unknown as { status: string }).status).toBe(
      TeamInvitationStatus.PENDING,
    );
    expect(
      externalInvitations.get(original.clerkInvitationId ?? '')?.status,
    ).toBe('revoked');
    const resentLocal = await prisma.db.teamInvitation.findUniqueOrThrow({
      where: { id: invitation.id },
    });
    expect(
      externalInvitations.get(resentLocal.clerkInvitationId ?? '')?.redirectUrl,
    ).toBe(
      `http://localhost:3001/accept-invitation?invitation=${invitation.id}`,
    );

    const revoked = await requestApp(app)
      .post(`/auth/clerk/invitations/${invitation.id}/revoke`)
      .set('Authorization', `Bearer ${admin.token}`)
      .set(ORGANIZATION_ID_HEADER, admin.organizationId)
      .expect(200);
    expect((revoked.body as unknown as { status: string }).status).toBe(
      TeamInvitationStatus.REVOKED,
    );

    const repeated = await requestApp(app)
      .post(`/auth/clerk/invitations/${invitation.id}/revoke`)
      .set('Authorization', `Bearer ${admin.token}`)
      .set(ORGANIZATION_ID_HEADER, admin.organizationId)
      .expect(200);
    expect((repeated.body as unknown as { status: string }).status).toBe(
      TeamInvitationStatus.REVOKED,
    );
  });

  it('acepta de forma idempotente y atómica creando User, Membership, Professional y AuditLog sin PII', async () => {
    const owner = await createActor(UserRole.OWNER);
    const email = `${unique('accept')}@a04.test`;
    const invitation = await createInvitation(owner, email);
    await markAccepted(invitation.id);
    const clerkUserId = `user_${unique('accepted')}`;
    const token = `token_${unique('accepted')}`;
    sessions.set(token, clerkUserId);
    addProfile(clerkUserId, email);

    const first = await requestApp(app)
      .post(`/auth/clerk/invitations/${invitation.id}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(first.body).toEqual({
      organizationId: owner.organizationId,
      role: UserRole.BARBER,
      professionalCreated: true,
    });

    const second = await requestApp(app)
      .post(`/auth/clerk/invitations/${invitation.id}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(second.body).toEqual(first.body);

    const user = await prisma.db.user.findUniqueOrThrow({
      where: { clerkUserId },
    });
    expect(user.password).toBeNull();
    expect(
      await prisma.db.membership.count({
        where: { userId: user.id, organizationId: owner.organizationId },
      }),
    ).toBe(1);
    expect(
      await prisma.db.professional.count({
        where: { userId: user.id, organizationId: owner.organizationId },
      }),
    ).toBe(1);
    const audits = await prisma.db.auditLog.findMany({
      where: {
        organizationId: owner.organizationId,
        entityId: { in: [invitation.id, user.id] },
      },
    });
    expect(JSON.stringify(audits)).not.toContain(email);
    expect(
      await prisma.db.teamInvitation.count({
        where: { id: invitation.id, status: TeamInvitationStatus.ACCEPTED },
      }),
    ).toBe(1);
  });

  it('usa un User existente solo por clerkUserId, nunca por coincidencia de correo', async () => {
    const owner = await createActor(UserRole.OWNER);
    const email = `${unique('existing-clerk')}@a04.test`;
    const clerkUserId = `user_${unique('existing-clerk')}`;
    const existing = await prisma.db.user.create({
      data: {
        name: 'Existing Clerk',
        email,
        password: null,
        clerkUserId,
      },
    });
    const invitation = await createInvitation(
      owner,
      email,
      UserRole.RECEPTIONIST,
      false,
    );
    await markAccepted(invitation.id);
    const token = `token_${unique('existing-clerk')}`;
    sessions.set(token, clerkUserId);
    addProfile(clerkUserId, email);

    await requestApp(app)
      .post(`/auth/clerk/invitations/${invitation.id}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(await prisma.db.user.count({ where: { clerkUserId } })).toBe(1);
    expect(
      await prisma.db.membership.count({
        where: {
          userId: existing.id,
          organizationId: owner.organizationId,
          role: UserRole.RECEPTIONIST,
        },
      }),
    ).toBe(1);
  });

  it.each([
    ['sin enlace', false],
    ['enlazado a otra identidad', true],
  ])(
    'rechaza 409 neutro ante correo local %s y no deja escrituras parciales',
    async (_caseName, linkedToAnotherIdentity) => {
      const owner = await createActor(UserRole.OWNER);
      const email = `${unique('collision')}@a04.test`;
      const existingClerkUserId = linkedToAnotherIdentity
        ? `user_${unique('other-identity')}`
        : null;
      await prisma.db.user.create({
        data: {
          name: 'Local Collision',
          email,
          password: existingClerkUserId ? null : 'legacy-hash',
          clerkUserId: existingClerkUserId,
        },
      });
      const invitation = await createInvitation(owner, email);
      await markAccepted(invitation.id);
      const clerkUserId = `user_${unique('collision-attempt')}`;
      const token = `token_${unique('collision-attempt')}`;
      sessions.set(token, clerkUserId);
      addProfile(clerkUserId, email);
      const before = {
        users: await prisma.db.user.count(),
        memberships: await prisma.db.membership.count(),
        professionals: await prisma.db.professional.count(),
        audits: await prisma.db.auditLog.count(),
      };

      const response = await requestApp(app)
        .post(`/auth/clerk/invitations/${invitation.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
      expect((response.body as unknown as { message: string }).message).toBe(
        'No es posible completar la invitación con los datos proporcionados.',
      );
      expect(await prisma.db.user.count()).toBe(before.users);
      expect(await prisma.db.membership.count()).toBe(before.memberships);
      expect(await prisma.db.professional.count()).toBe(before.professionals);
      expect(await prisma.db.auditLog.count()).toBe(before.audits);
      expect(
        await prisma.db.teamInvitation.findUniqueOrThrow({
          where: { id: invitation.id },
        }),
      ).toMatchObject({ status: TeamInvitationStatus.PENDING });
    },
  );

  it('hace rollback de Membership y AuditLog si falla el Professional opcional', async () => {
    const owner = await createActor(UserRole.OWNER);
    const email = `${unique('professional-rollback')}@a04.test`;
    const clerkUserId = `user_${unique('professional-rollback')}`;
    const user = await prisma.db.user.create({
      data: {
        name: 'Prelinked Professional',
        email,
        password: null,
        clerkUserId,
      },
    });
    await prisma.db.professional.create({
      data: {
        organizationId: owner.organizationId,
        userId: user.id,
        name: 'Existing Professional',
        status: 'ACTIVE',
        isPublic: true,
      },
    });
    const invitation = await createInvitation(owner, email);
    await markAccepted(invitation.id);
    const token = `token_${unique('professional-rollback')}`;
    sessions.set(token, clerkUserId);
    addProfile(clerkUserId, email);
    const auditCount = await prisma.db.auditLog.count();

    await requestApp(app)
      .post(`/auth/clerk/invitations/${invitation.id}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    expect(
      await prisma.db.membership.count({
        where: { userId: user.id, organizationId: owner.organizationId },
      }),
    ).toBe(0);
    expect(await prisma.db.auditLog.count()).toBe(auditCount);
    expect(
      await prisma.db.teamInvitation.findUniqueOrThrow({
        where: { id: invitation.id },
      }),
    ).toMatchObject({ status: TeamInvitationStatus.PENDING });
  });

  it('serializa dos aceptaciones concurrentes sin duplicar el agregado', async () => {
    const owner = await createActor(UserRole.OWNER);
    const email = `${unique('concurrent')}@a04.test`;
    const invitation = await createInvitation(owner, email);
    await markAccepted(invitation.id);
    const clerkUserId = `user_${unique('concurrent')}`;
    const token = `token_${unique('concurrent')}`;
    sessions.set(token, clerkUserId);
    addProfile(clerkUserId, email);

    const responses = await Promise.all([
      requestApp(app)
        .post(`/auth/clerk/invitations/${invitation.id}/accept`)
        .set('Authorization', `Bearer ${token}`),
      requestApp(app)
        .post(`/auth/clerk/invitations/${invitation.id}/accept`)
        .set('Authorization', `Bearer ${token}`),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 201,
    ]);
    const user = await prisma.db.user.findUniqueOrThrow({
      where: { clerkUserId },
    });
    expect(
      await prisma.db.membership.count({
        where: { userId: user.id, organizationId: owner.organizationId },
      }),
    ).toBe(1);
    expect(
      await prisma.db.professional.count({
        where: { userId: user.id, organizationId: owner.organizationId },
      }),
    ).toBe(1);
  });

  it('rechaza invitación no aceptada, expirada o fallo Clerk sin crear acceso', async () => {
    const owner = await createActor(UserRole.OWNER);
    const email = `${unique('invalid-state')}@a04.test`;
    const invitation = await createInvitation(owner, email);
    const clerkUserId = `user_${unique('invalid-state')}`;
    const token = `token_${unique('invalid-state')}`;
    sessions.set(token, clerkUserId);
    addProfile(clerkUserId, email);

    await requestApp(app)
      .post(`/auth/clerk/invitations/${invitation.id}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    await prisma.db.teamInvitation.update({
      where: { id: invitation.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await requestApp(app)
      .post(`/auth/clerk/invitations/${invitation.id}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    const secondEmail = `${unique('external-fail')}@a04.test`;
    const second = await createInvitation(owner, secondEmail);
    await markAccepted(second.id);
    const secondClerkUserId = `user_${unique('external-fail')}`;
    const secondToken = `token_${unique('external-fail')}`;
    sessions.set(secondToken, secondClerkUserId);
    addProfile(secondClerkUserId, secondEmail);
    failGetUser = true;
    const before = await prisma.db.membership.count();

    const response = await requestApp(app)
      .post(`/auth/clerk/invitations/${second.id}/accept`)
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(503);
    expect((response.body as unknown as { message: string }).message).toBe(
      'Servicio de autenticación no disponible temporalmente',
    );
    expect(await prisma.db.membership.count()).toBe(before);
  });

  it('conserva un estado FAILED auditable si Clerk no puede enviar', async () => {
    const owner = await createActor(UserRole.OWNER);
    failCreateInvitation = true;
    const email = `${unique('send-fail')}@a04.test`;

    await requestApp(app)
      .post('/auth/clerk/invitations')
      .set('Authorization', `Bearer ${owner.token}`)
      .set(ORGANIZATION_ID_HEADER, owner.organizationId)
      .send({ email, role: UserRole.ADMIN })
      .expect(503);

    expect(
      await prisma.db.teamInvitation.findFirst({
        where: { organizationId: owner.organizationId, email },
      }),
    ).toMatchObject({ status: TeamInvitationStatus.FAILED });
    expect(
      await prisma.db.membership.count({
        where: { organizationId: owner.organizationId },
      }),
    ).toBe(1);
  });

  it('aplica constraints PostgreSQL de rol, perfil y una sola invitación abierta', async () => {
    const owner = await createActor(UserRole.OWNER);
    const email = `${unique('constraint')}@a04.test`;
    const base = {
      organizationId: owner.organizationId,
      email,
      role: UserRole.ADMIN,
      invitedByUserId: owner.user.id,
      expiresAt: new Date(Date.now() + 86_400_000),
    };
    await prisma.db.teamInvitation.create({ data: base });

    await expect(
      prisma.db.teamInvitation.create({ data: base }),
    ).rejects.toBeDefined();
    await expect(
      prisma.db.teamInvitation.create({
        data: {
          ...base,
          email: `${unique('owner-role')}@a04.test`,
          role: UserRole.OWNER,
        },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.db.teamInvitation.create({
        data: {
          ...base,
          email: `${unique('profile-role')}@a04.test`,
          createPublicProfile: true,
        },
      }),
    ).rejects.toBeDefined();
  });
});
