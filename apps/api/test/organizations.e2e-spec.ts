import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('OrganizationsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let barberToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
    
    // Clean up
    await prisma.db.membership.deleteMany();
    await prisma.db.user.deleteMany();
    await prisma.db.organization.deleteMany();

    // Register a valid owner via the auth endpoint to get a token
    const res1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Owner',
        email: 'owner@test.com',
        password: 'password123',
        organizationName: 'Org1',
        organizationSlug: 'org1',
        organizationEmail: 'org1@test.com',
      });
      
    // Login to get token
    const loginRes1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner@test.com', password: 'password123' });
    ownerToken = loginRes1.body.accessToken;

    // We need a barber. Create one directly or via login trick if possible.
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Barber',
        email: 'barber2@test.com',
        password: 'password123',
        organizationName: 'Org3',
        organizationSlug: 'org3',
        organizationEmail: 'org3@test.com',
      });
      
    let loginRes2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'barber2@test.com', password: 'password123' });
    
    const barberId = loginRes2.body.user.id;
    // update role to BARBER
    await prisma.db.membership.updateMany({
      where: { userId: barberId },
      data: { role: 'BARBER' }
    });
    
    // Refresh token after role change
    const loginRes3 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'barber2@test.com', password: 'password123' });
    barberToken = loginRes3.body.accessToken;
  });

  afterAll(async () => {
    await prisma.db.membership.deleteMany();
    await prisma.db.user.deleteMany();
    await prisma.db.organization.deleteMany();
    await app.close();
  });

  describe('POST /organizations', () => {
    it('returns 401 Unauthorized when anonymous', async () => {
      return request(app.getHttpServer())
        .post('/organizations')
        .send({ name: 'New Org', slug: 'new-org', email: 'new@org.com' })
        .expect(401);
    });

    it('returns 403 Forbidden when role is not OWNER', async () => {
      return request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${barberToken}`)
        .send({ name: 'New Org', slug: 'new-org', email: 'new@org.com' })
        .expect(403);
    });

    it('returns 201 Created when role is OWNER', async () => {
      return request(app.getHttpServer())
        .post('/organizations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'New Org', slug: 'new-org', email: 'new@org.com' })
        .expect(201);
    });
  });
});
