import { createRequire } from 'node:module';
import type { Server } from 'node:http';
import type { Type } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { globalValidationPipeOptions } from '../common/validation.config';
const root = resolve(__dirname, '../../../..');
const loadModule = createRequire(__filename);
const run =
  process.env.RUN_POSTGRES_INTEGRATION === '1' ? describe : describe.skip;
type Booking = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  professionalId: string;
  serviceId: string;
  clientId?: string;
  client?: { name: string; email: string | null; phone: string | null };
  invoice?: { id: string; state: string } | null;
};
type WebClient = {
  configureApiAuth: (
    resolver: () => Promise<{ token: string; organizationId: string }>,
  ) => () => void;
  api: {
    get: <T>(path: string, params?: Record<string, string>) => Promise<T>;
    post: <T>(path: string, body: unknown) => Promise<T>;
    patch: <T>(path: string, body: unknown) => Promise<T>;
  };
};
function webClient(ref: string, origin: string): WebClient {
  const folder =
    ref === 'new'
      ? resolve(root, 'apps/web/lib')
      : resolve(root, '.tmp/m3-compat', ref, 'apps/web/lib');
  const cache = new Map<string, Record<string, unknown>>();
  function load(file: string): Record<string, unknown> {
    if (!file.startsWith(folder)) throw new Error('Web module escaped fixture');
    const cached = cache.get(file);
    if (cached) return cached;
    const exports: Record<string, unknown> = {};
    cache.set(file, exports);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
      },
    }).outputText;
    runInNewContext(code, {
      exports,
      require: (name: string) => {
        if (!name.startsWith('./'))
          throw new Error('Only pure local web client imports permitted');
        return load(resolve(dirname(file), name));
      },
      process: {
        env: { NODE_ENV: 'development', NEXT_PUBLIC_API_URL: origin },
      },
      fetch: (url: string, options: RequestInit) => {
        if (!url.startsWith(origin + '/'))
          throw new Error('External HTTP forbidden');
        return fetch(url, options);
      },
      FormData,
      Headers,
      URL,
      URLSearchParams,
      AbortController,
      AbortSignal,
      DOMException,
      setTimeout,
      clearTimeout,
      Date,
    });
    return exports;
  }
  return load(resolve(folder, 'api.ts')) as unknown as WebClient;
}
const phases = [
  { phase: '1 API/web anteriores esquema base', newApi: false, newWeb: false },
  {
    phase: '2 API/web anteriores esquema C1 (sin DDL)',
    newApi: false,
    newWeb: false,
  },
  { phase: '3 API nueva web anterior', newApi: true, newWeb: false },
  { phase: '4 API/web nuevas (web sin cambios)', newApi: true, newWeb: true },
  { phase: '5 rollback API/web anteriores', newApi: false, newWeb: false },
];
run(
  'M3 five deployment pairs, two exact source baselines, same disposable schema',
  () => {
    const db = new PrismaClient();
    afterAll(() => db.$disconnect());
    it.each(['8e1501e', 'b318ca5'])(
      '%s five pairs retain guest/availability/legacy/state/outbox/runtime',
      async (base) => {
        const webBase = base === '8e1501e' ? '8e1501e' : '523d993';
        const apiFolder = resolve(root, '.tmp/m3-compat', base, 'apps/api');
        const oldModule = loadModule(
          resolve(apiFolder, 'dist/app.module.js'),
        ) as {
          AppModule: Type<unknown>;
        };
        const oldPrisma = loadModule(
          resolve(apiFolder, 'dist/prisma/prisma.service.js'),
        ) as { PrismaService: Type<unknown> };
        let preservationId: string | undefined;
        for (const phase of phases) {
          const runtime = new PrismaClient({
            datasources: { db: { url: process.env.C1_RUNTIME_DATABASE_URL } },
          });
          const holder = { db: runtime } as unknown as PrismaService;
          const module = await Test.createTestingModule({
            imports: [phase.newApi ? AppModule : oldModule.AppModule],
          })
            .overrideProvider(
              phase.newApi ? PrismaService : oldPrisma.PrismaService,
            )
            .useValue(holder)
            .compile();
          const app = module.createNestApplication();
          app.useGlobalPipes(new ValidationPipe(globalValidationPipeOptions));
          await app.listen(0, '127.0.0.1');
          const address = (app.getHttpServer() as Server).address();
          if (!address || typeof address === 'string')
            throw new Error('Missing local address');
          const client = webClient(
            phase.newWeb ? 'new' : webBase,
            'http://127.0.0.1:' + address.port,
          );
          try {
            const org = await db.organization.create({
              data: {
                name: 'Synthetic compatibility',
                slug: randomUUID(),
                email: randomUUID() + '@test.invalid',
                timeZone: 'America/Santo_Domingo',
                businessSchedule: {
                  create: {
                    state: 'CONFIRMED',
                    zoneConfirmed: true,
                    days: {
                      create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
                        dayOfWeek,
                        windows: {
                          create: [{ startMinute: 540, endMinute: 1140 }],
                        },
                      })),
                    },
                  },
                },
              },
            });
            await db.cmsPage.update({
              where: { organizationId: org.id },
              data: {
                isPublished: true,
                publishedRevision: 0,
                publishedSnapshot: {
                  publicName: 'Synthetic compatibility',
                  phone: null,
                  description: null,
                  address: null,
                  googleMapsUrl: null,
                },
              },
            });
            const user = await db.user.create({
              data: {
                name: 'Synthetic owner',
                email: randomUUID() + '@test.invalid',
                memberships: {
                  create: { organizationId: org.id, role: 'OWNER' },
                },
              },
            });
            const professional = await db.professional.create({
              data: {
                organizationId: org.id,
                name: 'Synthetic professional',
                status: 'ACTIVE',
                isPublic: true,
              },
            });
            const service = await db.service.create({
              data: {
                organizationId: org.id,
                name: 'Synthetic service',
                duration: 30,
                price: 1,
              },
            });
            const contact = await db.client.create({
              data: {
                organizationId: org.id,
                name: 'Synthetic client',
                phone: '+18095550123',
              },
            });
            const token = new JwtService({
              secret: process.env.JWT_SECRET,
            }).sign({
              sub: user.id,
              organizationId: org.id,
              email: user.email,
              role: 'OWNER',
            });
            const reset = client.configureApiAuth(() =>
              Promise.resolve({
                token,
                organizationId: org.id,
              }),
            );
            try {
              const data = await client.api.get<{
                timeZone: string;
                services: unknown[];
                professionals: unknown[];
              }>('/public/' + org.slug + '/booking-data');
              expect(data.timeZone).toBe('America/Santo_Domingo');
              expect(data.services).toHaveLength(1);
              expect(data.professionals).toHaveLength(1);
              const before = await client.api.get<{
                slots: {
                  startTime: string;
                  time: string;
                  professionalId: string;
                }[];
              }>('/public/' + org.slug + '/availability', {
                date: '2099-01-02',
                serviceId: service.id,
                professionalId: professional.id,
              });
              expect(before.slots[0].startTime).toBe(
                '2099-01-02T13:00:00.000Z',
              );
              expect(
                before.slots.every((s) =>
                  ['00', '30'].includes(s.startTime.slice(14, 16)),
                ),
              ).toBe(true);
              const days = await client.api.get<{ availableDates: string[] }>(
                '/public/' + org.slug + '/availability-days',
                {
                  from: '2099-01-02',
                  to: '2099-01-03',
                  serviceId: service.id,
                  professionalId: professional.id,
                },
              );
              expect(days.availableDates).toEqual(['2099-01-02', '2099-01-03']);
              const guest = await client.api.post<{ booking: Booking }>(
                '/public/' + org.slug + '/bookings',
                {
                  serviceId: service.id,
                  professionalId: professional.id,
                  startTime: before.slots[0].startTime,
                  clientName: 'Synthetic guest',
                  clientPhone: '+18095550999',
                },
              );
              expect(guest.booking.status).toBe('PENDING');
              const internal = await client.api.post<Booking>('/bookings', {
                serviceId: service.id,
                professionalId: professional.id,
                clientId: contact.id,
                startTime: '2099-01-02T14:00:00Z',
              });
              expect(internal.status).toBe('PENDING');
              const list = await client.api.get<Booking[]>('/bookings');
              expect(list).toHaveLength(2);
              expect(list.find((b) => b.id === internal.id)?.client?.name).toBe(
                'Synthetic client',
              );
              expect(list.every((b) => b.invoice === null)).toBe(true);
              const legacy = await client.api.patch<Booking>(
                '/bookings/' + internal.id,
                { startTime: '2099-01-02T15:10:00Z' },
              );
              expect(legacy.startTime).toBe('2099-01-02T15:10:00.000Z');
              const changed = await client.api.patch<Booking>(
                '/bookings/' + internal.id + '/status',
                { status: 'CONFIRMED' },
              );
              expect(changed.status).toBe('CONFIRMED');
              const events = await db.bookingEmailEvent.count({
                where: { bookingId: internal.id },
              });
              expect(events).toBe(3);
              if (preservationId)
                expect(
                  (
                    await db.booking.findUniqueOrThrow({
                      where: { id: preservationId },
                    })
                  ).status,
                ).toBe('CONFIRMED');
              if (phase.newApi) {
                const detail = await client.api.get<
                  Booking & { updatedAt: string; revision: string }
                >('/bookings/' + internal.id);
                const moved = await client.api.patch<Booking>(
                  '/bookings/' + internal.id + '/reschedule',
                  {
                    startTime: '2099-01-03T14:00:00Z',
                    expectedUpdatedAt: detail.updatedAt,
                    expectedRevision: detail.revision,
                  },
                );
                expect(moved.status).toBe('CONFIRMED');
                expect(
                  await db.bookingEmailEvent.count({
                    where: { bookingId: internal.id },
                  }),
                ).toBe(4);
                preservationId = internal.id;
              }
              console.log(
                JSON.stringify({
                  base,
                  phase: phase.phase,
                  api: phase.newApi ? 'C1' : base,
                  web: phase.newWeb ? 'C1 (sin cambios)' : webBase,
                  schema: 'C0 = C1 (sin DDL)',
                  guest: true,
                  availability: true,
                  legacy: true,
                  state: true,
                  outbox: true,
                  preserved: !!preservationId,
                  webClientSha256: createHash('sha256')
                    .update(
                      readFileSync(
                        resolve(
                          phase.newWeb
                            ? resolve(root, 'apps/web/lib')
                            : resolve(
                                root,
                                '.tmp/m3-compat',
                                webBase,
                                'apps/web/lib',
                              ),
                          'api.ts',
                        ),
                      ),
                    )
                    .digest('hex'),
                }),
              );
            } finally {
              reset();
            }
          } finally {
            await app.close();
            await runtime.$disconnect();
            // Only the isolated test cluster, after every HTTP request and process settled.
            await db.securityRateBucket.deleteMany();
          }
        }
      },
      120000,
    );
  },
);
