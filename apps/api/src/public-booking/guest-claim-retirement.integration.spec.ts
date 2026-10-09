import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ClerkSessionVerifierService } from '../auth/clerk/clerk-session-verifier.service';
import { MediaPurgeWorker } from '../media/media-purge.worker';
import { globalValidationPipeOptions } from '../common/validation.config';
import {
  assertIsolatedDatabaseUrl,
  assertIsolatedDatabaseConnection,
} from '../common/assert-isolated-database-url';

const describePostgres =
  process.env.RUN_POSTGRES_INTEGRATION === '1' ? describe : describe.skip;

describePostgres(
  'Guest C1: retired claim cannot write to isolated PostgreSQL',
  () => {
    const db = new PrismaClient();
    let app: INestApplication;
    let organizationId: string;
    let organizationSlug: string;
    let userId: string;
    let serviceId: string;
    let professionalId: string;
    let bearer: string;
    let store: PrismaClient;
    let runtime: PrismaClient | undefined;
    let verify: jest.SpyInstance;
    let audit: jest.SpyInstance;
    const writes: jest.SpyInstance[] = [];

    beforeAll(async () => {
      const expectations = {
        primaryDatabaseName: 'barberflow',
        primaryDatabaseUser: 'barberflow',
      };
      const parsed = assertIsolatedDatabaseUrl(
        process.env.DATABASE_URL ?? '',
        expectations,
      );
      await assertIsolatedDatabaseConnection(db, parsed, expectations);
      const runtimeUrl = process.env.C1_RUNTIME_DATABASE_URL;
      if (!runtimeUrl)
        throw new Error('Dedicated isolated runtime URL required');
      const runtimeParsed = assertIsolatedDatabaseUrl(runtimeUrl, expectations);
      expect(runtimeParsed.hostname).toBe(parsed.hostname);
      expect(runtimeParsed.port).toBe(parsed.port);
      expect(runtimeParsed.pathname).toBe(parsed.pathname);
      runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
      const runtimeDb = runtime;
      const suffix = randomUUID();
      const organization = await db.organization.create({
        data: {
          name: 'Guest claim isolated fixture',
          slug: suffix,
          email: `${suffix}@example.test`,
          businessSchedule: {
            create: {
              state: 'CONFIRMED',
              zoneConfirmed: true,
              days: {
                create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
                  dayOfWeek,
                  windows: { create: { startMinute: 540, endMinute: 1140 } },
                })),
              },
            },
          },
        },
      });
      organizationId = organization.id;
      organizationSlug = organization.slug;
      await db.cmsPage.update({
        where: { organizationId },
        data: {
          isPublished: true,
          publishedRevision: 0,
          publishedSnapshot: {
            publicName: 'Guest isolated fixture',
            phone: null,
            description: null,
            address: null,
            googleMapsUrl: null,
          },
        },
      });
      const professional = await db.professional.create({
        data: {
          organizationId,
          name: 'Guest fixture professional',
          isPublic: true,
          status: 'ACTIVE',
        },
      });
      professionalId = professional.id;
      const service = await db.service.create({
        data: {
          organizationId,
          name: 'Guest fixture service',
          duration: 30,
          price: 100,
        },
      });
      serviceId = service.id;
      const user = await db.user.create({
        data: {
          name: 'Internal isolated fixture',
          email: `owner-${suffix}@example.test`,
        },
      });
      userId = user.id;
      await db.membership.create({
        data: { organizationId, userId, role: UserRole.OWNER },
      });
      await db.client.create({
        data: {
          organizationId,
          name: 'Guest isolated fixture',
          phone: '+18095550101',
        },
      });
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PrismaService)
        .useValue({
          db: runtimeDb,
          onModuleInit: () => runtimeDb.$connect(),
          onModuleDestroy: () => runtimeDb.$disconnect(),
        })
        .overrideProvider(MediaPurgeWorker)
        .useValue({})
        .compile();
      app = module.createNestApplication();
      app.useLogger(false);
      app.useGlobalPipes(new ValidationPipe(globalValidationPipeOptions));
      await app.init();
      store = app.get(PrismaService).db;
      const [role] = await store.$queryRaw<
        { name: string }[]
      >`SELECT current_user AS name`;
      expect(role.name).toBe('kortek_runtime');
      verify = jest.spyOn(app.get(ClerkSessionVerifierService), 'verify');
      audit = jest.spyOn(app.get(AuditService), 'log');
      writes.push(
        jest.spyOn(store.user, 'create'),
        jest.spyOn(store.user, 'createMany'),
        jest.spyOn(store.user, 'upsert'),
      );
      writes.push(
        jest.spyOn(store.membership, 'create'),
        jest.spyOn(store.membership, 'createMany'),
        jest.spyOn(store.membership, 'upsert'),
      );
      writes.push(
        jest.spyOn(store.client, 'update'),
        jest.spyOn(store.client, 'updateMany'),
        jest.spyOn(store.client, 'upsert'),
      );
      writes.push(
        jest.spyOn(store.auditLog, 'create'),
        jest.spyOn(store.auditLog, 'createMany'),
      );
      bearer = await app
        .get(JwtService)
        .signAsync({ sub: userId, organizationId, role: UserRole.OWNER });
    });

    async function snapshot() {
      const result = [];
      // Only counts/fingerprints enter failure output, never row content or PII.
      for (const table of ['User', 'Membership', 'Client', 'AuditLog']) {
        result.push(
          await db.$queryRawUnsafe(
            `SELECT count(*)::int AS count, md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) AS fingerprint FROM public."${table}" t`,
          ),
        );
      }
      return result;
    }

    it.each([false, true])(
      'claim is router 404, no User/Membership/Client/AuditLog writes; bearer=%s',
      async (authenticated) => {
        jest.clearAllMocks();
        const before = await snapshot();
        const req = request(app.getHttpServer() as Server).post(
          '/auth/clerk/customer/claims',
        );
        if (authenticated) req.set('Authorization', `Bearer ${bearer}`);
        const response = await req
          .send({ bookingId: randomUUID(), organizationSlug: organizationId })
          .expect(404);
        expect(response.body).toMatchObject({
          message: 'Cannot POST /auth/clerk/customer/claims',
        });
        expect(await snapshot()).toEqual(before);
        for (const write of writes) expect(write).not.toHaveBeenCalled();
        expect(audit).not.toHaveBeenCalled();
        expect(verify).not.toHaveBeenCalled();
      },
    );

    it.each([false, true])(
      'guest booking is 201/PENDING with operational Client only; internal bearer=%s',
      async (authenticated) => {
        jest.clearAllMocks();
        const users = await db.user.count();
        const memberships = await db.membership.count();
        const clients = await db.client.count();
        const req = request(app.getHttpServer() as Server).post(
          `/public/${organizationSlug}/bookings`,
        );
        if (authenticated) req.set('Authorization', `Bearer ${bearer}`);
        const response = await req
          .send({
            serviceId,
            professionalId,
            startTime: authenticated
              ? '2099-01-06T14:00:00Z'
              : '2099-01-05T14:00:00Z',
            clientName: 'Guest booking fixture',
            clientPhone: authenticated ? '+18095550202' : '+18095550201',
          })
          .expect(201);
        expect(response.body).toMatchObject({
          booking: { status: 'PENDING', serviceId, professionalId },
        });
        expect(Object.keys(response.body as object)).toEqual(['booking']);
        expect(response.body).not.toHaveProperty('accountCreated');
        expect(response.body).not.toHaveProperty('accountCreationError');
        const body = response.body as { booking: { id: string } };
        const booking = await db.booking.findUniqueOrThrow({
          where: { id: body.booking.id },
          include: { client: true },
        });
        expect(booking.organizationId).toBe(organizationId);
        expect(booking.status).toBe('PENDING');
        expect(booking.client.userId).toBeNull();
        expect(await db.client.count()).toBe(clients + 1);
        expect(await db.user.count()).toBe(users);
        expect(await db.membership.count()).toBe(memberships);
        expect(writes[0]).not.toHaveBeenCalled();
        expect(writes[3]).not.toHaveBeenCalled();
        expect(verify).not.toHaveBeenCalled();
      },
    );

    afterAll(async () => {
      jest.restoreAllMocks();
      if (app) await app.close();
      if (runtime) await runtime.$disconnect();
      // Fixture exists only in the freshly created cluster; runner removes that cluster.
      await db.$disconnect();
    });
  },
);
