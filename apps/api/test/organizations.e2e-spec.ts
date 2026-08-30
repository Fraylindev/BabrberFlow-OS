import { INestApplication } from '@nestjs/common';
import { PrismaService } from './../src/prisma/prisma.service';
import { createE2eApp, requestApp } from './create-e2e-app';

function readLoginBody(body: unknown): { accessToken: string } {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Login response was not an object');
  }
  if (!('accessToken' in body) || typeof body.accessToken !== 'string') {
    throw new Error('Login response did not include accessToken');
  }
  return { accessToken: body.accessToken };
}

describe('OrganizationsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('rutas de alta/resolución retiradas', () => {
    it('no crea organizaciones huérfanas mediante POST /organizations', async () => {
      const before = await prisma.db.organization.count();
      await requestApp(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'New Org',
          slug: 'new-org-retired-route',
          email: 'new-retired-route@org.test',
        })
        .expect(404);
      expect(await prisma.db.organization.count()).toBe(before);
    });

    it('no expone UUID interno mediante resolución pública de slug', async () => {
      await requestApp(app).get('/organizations/by-slug/any-slug').expect(404);
    });
  });
});
