import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

import { ValidationPipe } from '@nestjs/common';
import { globalValidationPipeOptions } from './../src/common/validation.config';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(globalValidationPipeOptions));
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
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('organizationId')]),
      );
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
        email: `concurrent-${ts}@test.com`, // same email
        password: 'password123',
        organizationName: `Concurrent Org 2 ${ts}`,
        organizationSlug: `concurrent-org-2-${ts}`,
        organizationEmail: `org2-${ts}@test.com`,
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
