import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('returns 400 if organizationId is sent', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'password123',
          organizationName: 'Test Org',
          organizationSlug: 'test-org',
          organizationEmail: 'org@test.com',
          organizationId: 'should-not-be-allowed',
        });
        
      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.arrayContaining([expect.stringContaining('organizationId')]));
    });
  });

  describe('Concurrent Registration', () => {
    it('handles concurrent registration for the same email gracefully', async () => {
      const payload1 = {
        name: 'Concurrent User 1',
        email: 'concurrent@test.com',
        password: 'password123',
        organizationName: 'Concurrent Org 1',
        organizationSlug: 'concurrent-org-1',
        organizationEmail: 'org1@test.com',
      };
      
      const payload2 = {
        name: 'Concurrent User 2',
        email: 'concurrent@test.com', // same email
        password: 'password123',
        organizationName: 'Concurrent Org 2',
        organizationSlug: 'concurrent-org-2',
        organizationEmail: 'org2@test.com',
      };

      const [res1, res2] = await Promise.all([
        request(app.getHttpServer()).post('/auth/register').send(payload1),
        request(app.getHttpServer()).post('/auth/register').send(payload2),
      ]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(201); // One should succeed
      expect(statuses).toContain(409); // One should fail with Conflict
    });
  });
});
