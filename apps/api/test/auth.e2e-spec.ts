import { INestApplication } from '@nestjs/common';
import { PrismaService } from './../src/prisma/prisma.service';
import { AuditService } from './../src/audit/audit.service';
import { createE2eApp, requestApp } from './create-e2e-app';

function validationMessages(body: unknown): string[] {
  if (typeof body !== 'object' || body === null || !('message' in body)) {
    return [];
  }
  const { message } = body;
  if (
    Array.isArray(message) &&
    message.every((item): item is string => typeof item === 'string')
  ) {
    return message;
  }
  return [];
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('returns 400 if organizationId is sent', async () => {
      const res = await requestApp(app).post('/auth/register').send({
        name: 'Test User',
        email: 'test@test.com',
        password: 'password123',
        organizationName: 'Test Org',
        organizationSlug: 'test-org',
        organizationEmail: 'org@test.com',
        organizationId: 'should-not-be-allowed',
      });

      expect(res.status).toBe(400);
      expect(validationMessages(res.body).join(' ')).toContain(
        'organizationId',
      );
    });

    it('returns 400 for an invalid slug', async () => {
      const res = await requestApp(app).post('/auth/register').send({
        name: 'Test User',
        email: 'invalid-slug@test.com',
        password: 'password123',
        organizationName: 'Test Org',
        organizationSlug: '-Invalid Slug/',
        organizationEmail: 'org@test.com',
      });

      expect(res.status).toBe(400);
    });

    it('persists a normalized slug and a distinct organization email', async () => {
      const ts = Date.now();
      const ownerEmail = `owner-norm-${ts}@test.com`;
      const organizationEmail = `shop-norm-${ts}@test.com`;
      const res = await requestApp(app)
        .post('/auth/register')
        .send({
          name: 'Owner',
          email: ownerEmail,
          password: 'password123',
          organizationName: 'Norm Shop',
          organizationSlug: `NORM-SHOP-${ts}`,
          organizationEmail,
        });

      expect(res.status).toBe(201);

      const org = await prisma.db.organization.findUnique({
        where: { slug: `norm-shop-${ts}` },
      });
      expect(org).not.toBeNull();
      expect(org?.email).toBe(organizationEmail);
      expect(org?.email).not.toBe(ownerEmail);

      const user = await prisma.db.user.findUnique({
        where: { email: ownerEmail },
      });
      expect(user).not.toBeNull();
    });
  });

  describe('Concurrent Registration', () => {
    it('handles concurrent registration for the same email gracefully', async () => {
      const ts = Date.now();
      const payload1 = {
        name: 'Concurrent User 1',
        email: `concurrent-${ts}@test.com`,
        password: 'password123',
        organizationName: `Concurrent Org 1 ${ts}`,
        organizationSlug: `concurrent-org-1-${ts}`,
        organizationEmail: `org1-${ts}@test.com`,
      };

      const payload2 = {
        name: 'Concurrent User 2',
        email: `concurrent-${ts}@test.com`,
        password: 'password123',
        organizationName: `Concurrent Org 2 ${ts}`,
        organizationSlug: `concurrent-org-2-${ts}`,
        organizationEmail: `org2-${ts}@test.com`,
      };

      const [res1, res2] = await Promise.all([
        requestApp(app).post('/auth/register').send(payload1),
        requestApp(app).post('/auth/register').send(payload2),
      ]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);

      const users = await prisma.db.user.findMany({
        where: { email: payload1.email },
        select: { id: true },
      });
      const organizations = await prisma.db.organization.findMany({
        where: {
          slug: { in: [payload1.organizationSlug, payload2.organizationSlug] },
        },
        select: { id: true },
      });
      const memberships = await prisma.db.membership.count({
        where: { userId: { in: users.map(({ id }) => id) } },
      });
      const auditLogs = await prisma.db.auditLog.count({
        where: {
          organizationId: { in: organizations.map(({ id }) => id) },
          action: 'CREATE',
          entity: 'Organization',
        },
      });

      expect(users).toHaveLength(1);
      expect(organizations).toHaveLength(1);
      expect(memberships).toBe(1);
      expect(auditLogs).toBe(1);
    });
  });
});

describe('AuthController register rollback (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createE2eApp((builder) =>
      builder.overrideProvider(AuditService).useValue({
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

  it('does not persist User, Organization, Membership or AuditLog when audit fails', async () => {
    const ts = Date.now();
    const email = `rollback-${ts}@test.com`;
    const slug = `rollback-${ts}`;
    const beforeAudit = await prisma.db.auditLog.count();

    const res = await requestApp(app)
      .post('/auth/register')
      .send({
        name: 'Rollback',
        email,
        password: 'password123',
        organizationName: 'Rollback Shop',
        organizationSlug: slug,
        organizationEmail: `rollback-org-${ts}@test.com`,
      });

    expect(res.status).toBeGreaterThanOrEqual(500);

    expect(await prisma.db.user.findUnique({ where: { email } })).toBeNull();
    expect(
      await prisma.db.organization.findUnique({ where: { slug } }),
    ).toBeNull();
    expect(
      await prisma.db.membership.count({
        where: { user: { email } },
      }),
    ).toBe(0);
    expect(await prisma.db.auditLog.count()).toBe(beforeAudit);
  });
});
