import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ProfessionalStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2eApp, requestApp } from './create-e2e-app';

interface MemberFixture {
  id: string;
  email: string;
  token: string;
}

interface TeamDirectoryPage {
  items: Array<{
    email: string;
    professional: { name: string; status: string } | null;
  }>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type HttpTest = ReturnType<ReturnType<typeof requestApp>['get']>;

describe('Equipo - members management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let sequence = 0;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  function unique(label: string): string {
    sequence += 1;
    return `${label}-${Date.now()}-${sequence}`;
  }

  async function createOrganization(label: string): Promise<string> {
    const key = unique(label);
    const organization = await prisma.db.organization.create({
      data: {
        name: `Organization ${key}`,
        slug: `team-${key}`,
        email: `organization-${key}@team.test`,
      },
    });
    return organization.id;
  }

  async function createMember(
    organizationId: string,
    role: UserRole,
    label: string,
  ): Promise<MemberFixture> {
    const key = unique(label);
    const email = `${key}@team.test`;
    const user = await prisma.db.user.create({
      data: {
        name: `Member ${label}`,
        email,
        password: null,
        lastOrganizationId: organizationId,
      },
    });
    await prisma.db.membership.create({
      data: { organizationId, userId: user.id, role },
    });
    const token = await jwt.signAsync({
      sub: user.id,
      email,
      role,
      organizationId,
    });
    return { id: user.id, email, token };
  }

  function authorized(request: HttpTest, token: string): HttpTest {
    return request.set('Authorization', `Bearer ${token}`);
  }

  it('paginates a minimal tenant-scoped directory and keeps the legacy Professionals projection protected', async () => {
    const organizationA = await createOrganization('directory-a');
    const organizationB = await createOrganization('directory-b');
    const owner = await createMember(
      organizationA,
      UserRole.OWNER,
      'directory-owner',
    );
    const admin = await createMember(
      organizationA,
      UserRole.ADMIN,
      'directory-admin',
    );
    const barber = await createMember(
      organizationA,
      UserRole.BARBER,
      'directory-barber',
    );
    const receptionist = await createMember(
      organizationA,
      UserRole.RECEPTIONIST,
      'directory-receptionist',
    );
    const foreignOwner = await createMember(
      organizationB,
      UserRole.OWNER,
      'directory-foreign',
    );
    await prisma.db.professional.createMany({
      data: [
        {
          organizationId: organizationA,
          userId: barber.id,
          name: 'Perfil propio A',
          phone: '+18095550001',
          status: ProfessionalStatus.ACTIVE,
          isPublic: true,
        },
        {
          organizationId: organizationB,
          userId: foreignOwner.id,
          name: 'Perfil ajeno B',
          phone: '+18095550002',
          status: ProfessionalStatus.INACTIVE,
          isPublic: false,
        },
      ],
    });

    const firstPage = await authorized(
      requestApp(app).get('/organizations/mine/team-members?page=1&limit=2'),
      owner.token,
    ).expect(200);
    const secondPage = await authorized(
      requestApp(app).get('/organizations/mine/team-members?page=2&limit=2'),
      owner.token,
    ).expect(200);
    const firstPageBody = firstPage.body as unknown as TeamDirectoryPage;
    const secondPageBody = secondPage.body as unknown as TeamDirectoryPage;
    const combined = [...firstPageBody.items, ...secondPageBody.items];

    expect(firstPageBody).toEqual(
      expect.objectContaining({ page: 1, limit: 2, total: 4, totalPages: 2 }),
    );
    expect(combined).toHaveLength(4);
    expect(combined.map((member) => member.email)).toContain(barber.email);
    expect(combined.map((member) => member.email)).not.toContain(
      foreignOwner.email,
    );
    expect(
      combined.find((member) => member.email === barber.email)?.professional,
    ).toEqual({
      name: 'Perfil propio A',
      status: ProfessionalStatus.ACTIVE,
    });
    expect(
      JSON.stringify({
        firstPage: firstPageBody,
        secondPage: secondPageBody,
      }),
    ).not.toMatch(
      /"(id|membershipId|organizationId|userId|clerkUserId|password|phone|createdAt|updatedAt)"/i,
    );
    await authorized(
      requestApp(app).get('/organizations/mine/team-members'),
      admin.token,
    ).expect(200);

    for (const denied of [barber, receptionist]) {
      await authorized(
        requestApp(app).get('/organizations/mine/team-members'),
        denied.token,
      ).expect(403);
      await authorized(
        requestApp(app)
          .patch('/organizations/mine/team-members/role')
          .send({ email: owner.email, role: UserRole.ADMIN }),
        denied.token,
      ).expect(403);
      await authorized(
        requestApp(app)
          .post('/organizations/mine/team-members/revoke')
          .send({ email: owner.email }),
        denied.token,
      ).expect(403);
    }

    await authorized(
      requestApp(app).get('/organizations/mine/team-members?page=0'),
      owner.token,
    ).expect(400);
    await authorized(
      requestApp(app).get('/organizations/mine/team-members?limit=101'),
      owner.token,
    ).expect(400);

    const legacy = await authorized(
      requestApp(app).get('/organizations/mine/members'),
      owner.token,
    ).expect(200);
    expect(JSON.stringify(legacy.body)).not.toContain(foreignOwner.email);
    expect(JSON.stringify(legacy.body)).not.toMatch(
      /"(phone|password|clerkUserId|organizationId|userId)"/i,
    );
    await authorized(
      requestApp(app).get('/organizations/mine/members'),
      admin.token,
    ).expect(200);
    for (const denied of [barber, receptionist]) {
      await authorized(
        requestApp(app).get('/organizations/mine/members'),
        denied.token,
      ).expect(403);
    }
  });

  it('changes roles and revokes access idempotently without touching Professional', async () => {
    const organizationA = await createOrganization('manage-a');
    const organizationB = await createOrganization('manage-b');
    const owner = await createMember(
      organizationA,
      UserRole.OWNER,
      'manage-owner',
    );
    const admin = await createMember(
      organizationA,
      UserRole.ADMIN,
      'manage-admin',
    );
    const barber = await createMember(
      organizationA,
      UserRole.BARBER,
      'manage-barber',
    );
    const foreign = await createMember(
      organizationB,
      UserRole.BARBER,
      'manage-foreign',
    );
    const professional = await prisma.db.professional.create({
      data: {
        organizationId: organizationA,
        userId: barber.id,
        name: 'Profesional preservado',
        phone: '+18095550003',
        status: ProfessionalStatus.ACTIVE,
        isPublic: true,
      },
    });

    const changed = await authorized(
      requestApp(app)
        .patch('/organizations/mine/team-members/role')
        .send({
          email: `  ${barber.email.toUpperCase()}  `,
          role: UserRole.RECEPTIONIST,
        }),
      owner.token,
    ).expect(200);
    expect(changed.body).toEqual({
      name: 'Member manage-barber',
      email: barber.email,
      role: UserRole.RECEPTIONIST,
      accessStatus: 'ACTIVE',
      professional: {
        name: professional.name,
        status: ProfessionalStatus.ACTIVE,
      },
    });

    await authorized(
      requestApp(app)
        .patch('/organizations/mine/team-members/role')
        .send({ email: barber.email, role: UserRole.RECEPTIONIST }),
      owner.token,
    ).expect(200);
    expect(
      await prisma.db.auditLog.count({
        where: {
          organizationId: organizationA,
          action: 'UPDATE_ROLE',
          entity: 'Membership',
        },
      }),
    ).toBe(1);

    await authorized(
      requestApp(app)
        .patch('/organizations/mine/team-members/role')
        .send({ email: owner.email, role: UserRole.BARBER }),
      admin.token,
    ).expect(403);
    await authorized(
      requestApp(app)
        .post('/organizations/mine/team-members/revoke')
        .send({ email: owner.email }),
      admin.token,
    ).expect(403);
    await authorized(
      requestApp(app)
        .patch('/organizations/mine/team-members/role')
        .send({ email: barber.email, role: UserRole.OWNER }),
      owner.token,
    ).expect(400);
    await authorized(
      requestApp(app).patch('/organizations/mine/team-members/role').send({
        email: barber.email,
        role: UserRole.ADMIN,
        phone: 'not-allowed',
      }),
      owner.token,
    ).expect(400);

    await authorized(
      requestApp(app)
        .patch('/organizations/mine/team-members/role')
        .send({ email: foreign.email, role: UserRole.ADMIN }),
      owner.token,
    ).expect(404);
    await authorized(
      requestApp(app)
        .post('/organizations/mine/team-members/revoke')
        .send({ email: foreign.email }),
      owner.token,
    ).expect(204);
    expect(
      await prisma.db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: foreign.id,
            organizationId: organizationB,
          },
        },
      }),
    ).not.toBeNull();

    await authorized(
      requestApp(app)
        .post('/organizations/mine/team-members/revoke')
        .send({ email: barber.email }),
      admin.token,
    ).expect(204);
    await authorized(
      requestApp(app)
        .post('/organizations/mine/team-members/revoke')
        .send({ email: barber.email }),
      admin.token,
    ).expect(204);
    expect(
      await prisma.db.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: barber.id,
            organizationId: organizationA,
          },
        },
      }),
    ).toBeNull();
    expect(
      await prisma.db.professional.findUnique({
        where: { id: professional.id },
      }),
    ).toEqual(
      expect.objectContaining({
        id: professional.id,
        userId: barber.id,
        status: ProfessionalStatus.ACTIVE,
      }),
    );
    expect(
      await prisma.db.auditLog.count({
        where: {
          organizationId: organizationA,
          action: 'REVOKE_ACCESS',
          entity: 'Membership',
        },
      }),
    ).toBe(1);

    await authorized(
      requestApp(app).get('/organizations/mine/team-members'),
      barber.token,
    ).expect(401);

    const audit = await prisma.db.auditLog.findMany({
      where: {
        organizationId: organizationA,
        action: { in: ['UPDATE_ROLE', 'REVOKE_ACCESS'] },
      },
    });
    expect(JSON.stringify(audit)).not.toContain(barber.email);
    expect(JSON.stringify(audit)).not.toContain(owner.email);
  });

  it('preserves one OWNER under last-owner checks and concurrent revocations', async () => {
    const organizationId = await createOrganization('owners');
    const ownerA = await createMember(
      organizationId,
      UserRole.OWNER,
      'owner-a',
    );

    await authorized(
      requestApp(app)
        .patch('/organizations/mine/team-members/role')
        .send({ email: ownerA.email, role: UserRole.ADMIN }),
      ownerA.token,
    ).expect(409);
    await authorized(
      requestApp(app)
        .post('/organizations/mine/team-members/revoke')
        .send({ email: ownerA.email }),
      ownerA.token,
    ).expect(409);

    const ownerB = await createMember(
      organizationId,
      UserRole.OWNER,
      'owner-b',
    );
    await authorized(
      requestApp(app)
        .patch('/organizations/mine/team-members/role')
        .send({ email: ownerB.email, role: UserRole.ADMIN }),
      ownerA.token,
    ).expect(200);
    const ownerC = await createMember(
      organizationId,
      UserRole.OWNER,
      'owner-c',
    );
    const [resultA, resultB] = await Promise.all([
      authorized(
        requestApp(app)
          .post('/organizations/mine/team-members/revoke')
          .send({ email: ownerC.email }),
        ownerA.token,
      ),
      authorized(
        requestApp(app)
          .post('/organizations/mine/team-members/revoke')
          .send({ email: ownerA.email }),
        ownerC.token,
      ),
    ]);

    expect(
      [resultA.status, resultB.status].filter((status) => status === 204),
    ).toHaveLength(1);
    // La petición perdedora puede observar la revocación en el guard (401),
    // al revalidar el actor dentro del servicio (403), o en la invariante de
    // último OWNER (409), según el interleaving exacto.
    expect([401, 403, 409]).toContain(
      [resultA.status, resultB.status].find((status) => status !== 204),
    );
    expect(
      await prisma.db.membership.count({
        where: { organizationId, role: UserRole.OWNER },
      }),
    ).toBe(1);
  });
});
