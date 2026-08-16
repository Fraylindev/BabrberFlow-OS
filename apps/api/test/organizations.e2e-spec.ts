import { INestApplication } from '@nestjs/common';
import { PrismaService } from './../src/prisma/prisma.service';
import { createE2eApp, requestApp } from './create-e2e-app';

function readLoginBody(body: unknown): { accessToken: string; userId: string } {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Login response was not an object');
  }
  if (!('accessToken' in body) || typeof body.accessToken !== 'string') {
    throw new Error('Login response did not include accessToken');
  }
  if (
    !('user' in body) ||
    typeof body.user !== 'object' ||
    body.user === null ||
    !('id' in body.user) ||
    typeof body.user.id !== 'string'
  ) {
    throw new Error('Login response did not include user.id');
  }
  return { accessToken: body.accessToken, userId: body.user.id };
}

describe('OrganizationsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let barberToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(PrismaService);

    const ts = Date.now();
    await requestApp(app)
      .post('/auth/register')
      .send({
        name: 'Owner',
        email: `owner-${ts}@test.com`,
        password: 'password123',
        organizationName: `Org1-${ts}`,
        organizationSlug: `org1-${ts}`,
        organizationEmail: `org1-${ts}@test.com`,
      })
      .expect(201);

    const loginRes1 = await requestApp(app)
      .post('/auth/login')
      .send({ email: `owner-${ts}@test.com`, password: 'password123' });
    ownerToken = readLoginBody(loginRes1.body).accessToken;

    await requestApp(app)
      .post('/auth/register')
      .send({
        name: 'Barber',
        email: `barber2-${ts}@test.com`,
        password: 'password123',
        organizationName: `Org3-${ts}`,
        organizationSlug: `org3-${ts}`,
        organizationEmail: `org3-${ts}@test.com`,
      })
      .expect(201);

    const loginRes2 = await requestApp(app)
      .post('/auth/login')
      .send({ email: `barber2-${ts}@test.com`, password: 'password123' });
    const barberId = readLoginBody(loginRes2.body).userId;

    await prisma.db.membership.updateMany({
      where: { userId: barberId },
      data: { role: 'BARBER' },
    });

    const loginRes3 = await requestApp(app)
      .post('/auth/login')
      .send({ email: `barber2-${ts}@test.com`, password: 'password123' });
    barberToken = readLoginBody(loginRes3.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /organizations', () => {
    it('returns 401 Unauthorized when anonymous', async () => {
      return requestApp(app)
        .post('/organizations')
        .send({ name: 'New Org', slug: 'new-org', email: 'new@org.com' })
        .expect(401);
    });

    it('returns 403 Forbidden when role is not OWNER', async () => {
      return requestApp(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${barberToken}`)
        .send({ name: 'New Org', slug: 'new-org', email: 'new@org.com' })
        .expect(403);
    });

    it('returns 201 Created when role is OWNER', async () => {
      const ts = Date.now();
      return requestApp(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'New Org',
          slug: `new-org-${ts}`,
          email: `new-${ts}@org.com`,
        })
        .expect(201);
    });
  });
});
