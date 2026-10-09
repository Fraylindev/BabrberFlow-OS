import { randomUUID } from 'node:crypto';
import {
  BusinessScheduleState,
  BookingStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { ProfessionalAvailabilityService } from '../professionals/professional-availability.service';
import { PublicBookingService } from '../public-booking/public-booking.service';
import {
  assertIsolatedDatabaseUrl,
  assertIsolatedDatabaseConnection,
} from '../common/assert-isolated-database-url';
import { lockOrganizationSchedule } from '../common/organization-schedule-lock';
import { BusinessScheduleService } from './business-schedule.service';
import { SchedulePageDto } from './business-schedule.dto';
import {
  inspectBusinessScheduleIntegrity,
  ScheduleTriggerMetadata,
  ScheduleFunctionMetadata,
} from '../prisma/business-schedule-integrity';

const describeDatabase =
  process.env.RUN_BUSINESS_SCHEDULE_INTEGRATION === '1'
    ? describe
    : describe.skip;
const OPEN_WEEK = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  windows: [{ startTime: '09:00', endTime: '19:00' }],
}));
const CLOSED_WEEK = OPEN_WEEK.map((d) => ({ ...d, windows: [] }));
describeDatabase('C1 schedule: real isolated PostgreSQL/runtime', () => {
  const db = new PrismaClient();
  const runtimeUrl =
    process.env.C1_RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL;
  const runtime = new PrismaClient(
    runtimeUrl ? { datasources: { db: { url: runtimeUrl } } } : undefined,
  );
  const runtimeHolder = { db: runtime } as unknown as PrismaService;
  const audit = new AuditService(runtimeHolder);
  const schedule = new BusinessScheduleService(runtimeHolder, audit);
  const availability = new ProfessionalAvailabilityService(
    runtimeHolder,
    audit,
  );
  const bookings = new BookingsService(runtimeHolder, availability);
  const publicBooking = new PublicBookingService(
    runtimeHolder,
    bookings,
    audit,
    availability,
  );
  it.each(['trigger', 'function'])(
    'detects a damaged %s and rolls the isolated probe back',
    async (kind) => {
      const sentinel = new Error('rollback schema probe');
      await expect(
        db.$transaction(async (tx) => {
          if (kind === 'trigger')
            await tx.$executeRawUnsafe(
              'ALTER TABLE "BusinessSchedule" DISABLE TRIGGER "BusinessSchedule_complete_week"',
            );
          else
            await tx.$executeRawUnsafe(
              'CREATE OR REPLACE FUNCTION validate_business_schedule() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$',
            );
          const triggers = await tx.$queryRaw<
            ScheduleTriggerMetadata[]
          >`SELECT tgname AS name, pg_get_triggerdef(oid) AS definition, tgenabled::text AS enabled FROM pg_trigger WHERE tgname IN ('BusinessSchedule_complete_week','BusinessScheduleDay_complete_week','BusinessScheduleWindow_limit')`;
          const functions = await tx.$queryRaw<
            ScheduleFunctionMetadata[]
          >`SELECT prosrc AS source, prosecdef AS "securityDefiner" FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='validate_business_schedule' AND pronargs=0`;
          expect(
            inspectBusinessScheduleIntegrity(triggers, functions),
          ).toHaveLength(1);
          throw sentinel;
        }),
      ).rejects.toBe(sentinel);
    },
  );
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
    delete process.env.PUBLIC_BOOKING_CLOSED;
  });
  afterAll(async () => {
    await runtime.$disconnect();
    await db.$disconnect();
  });
  async function fixture(
    state: BusinessScheduleState = BusinessScheduleState.CONFIRMED,
    zone = 'America/Santo_Domingo',
  ) {
    const suffix = randomUUID();
    const org = await db.organization.create({
      data: {
        name: 'C1 controlled business',
        slug: suffix,
        email: `${suffix}@test.invalid`,
        timeZone: zone,
        businessSchedule: {
          create: {
            state,
            zoneConfirmed: state === BusinessScheduleState.CONFIRMED,
            legacyCategory:
              state === BusinessScheduleState.LEGACY_UNCONFIRMED
                ? 'SQL_NULL'
                : null,
            legacyPublicAllowed:
              state === BusinessScheduleState.LEGACY_UNCONFIRMED,
            days:
              state === BusinessScheduleState.CONFIRMED
                ? {
                    create: OPEN_WEEK.map((d) => ({
                      dayOfWeek: d.dayOfWeek,
                      windows: {
                        create: [{ startMinute: 540, endMinute: 1140 }],
                      },
                    })),
                  }
                : undefined,
          },
        },
      },
    });
    await db.cmsPage.update({
      where: { organizationId: org.id },
      data: {
        publishedSnapshot: {
          publicName: 'Controlled business',
          phone: null,
          description: null,
          address: null,
          googleMapsUrl: null,
        },
        publishedRevision: 0,
        isPublished: true,
      },
    });
    const owner = await db.user.create({
      data: {
        name: 'C1 owner',
        email: `owner-${suffix}@test.invalid`,
        memberships: { create: { organizationId: org.id, role: 'OWNER' } },
      },
    });
    const professional = await db.professional.create({
      data: {
        name: 'A professional',
        organizationId: org.id,
        isPublic: true,
        status: 'ACTIVE',
      },
    });
    const client = await db.client.create({
      data: {
        name: 'Controlled client',
        organizationId: org.id,
        phone: '+18095550101',
      },
    });
    const service = await db.service.create({
      data: {
        name: 'Controlled service',
        organizationId: org.id,
        duration: 30,
        price: 100,
      },
    });
    return { org, owner, professional, client, service };
  }
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const bookingDto = (f: Fixture, startTime = '2099-01-05T14:00:00.000Z') => ({
    clientId: f.client.id,
    professionalId: f.professional.id,
    serviceId: f.service.id,
    startTime,
  });
  const closureDto = (expectedRevision = 0) => ({
    expectedRevision,
    startDate: '2099-01-05',
    endDate: '2099-01-05',
    startTime: '10:00',
    endTime: '11:00',
    reason: 'Private reason — never public',
  });
  async function rawBooking(
    f: Fixture,
    status: BookingStatus = 'PENDING',
    start = new Date('2099-01-05T14:00Z'),
    end = new Date('2099-01-05T14:30Z'),
  ) {
    return db.booking.create({
      data: {
        organizationId: f.org.id,
        clientId: f.client.id,
        professionalId: f.professional.id,
        serviceId: f.service.id,
        status,
        startTime: start,
        endTime: end,
      },
    });
  }
  async function snapshot(f: Fixture) {
    return {
      schedule: await db.businessSchedule.findUnique({
        where: { organizationId: f.org.id },
        include: {
          days: {
            orderBy: { dayOfWeek: 'asc' },
            include: { windows: { orderBy: { id: 'asc' } } },
          },
          closures: { orderBy: { id: 'asc' } },
          revisions: { orderBy: { revision: 'asc' } },
        },
      }),
      bookings: await db.booking.findMany({
        where: { organizationId: f.org.id },
        orderBy: { id: 'asc' },
      }),
    };
  }
  async function assertAvailableExisting(f: Fixture) {
    const rows = await db.booking.findMany({
      where: {
        organizationId: f.org.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        endTime: { gt: new Date() },
      },
    });
    for (const b of rows) {
      const context = await availability.getPublicContext(
        f.org.id,
        [f.professional.id],
        b.startTime,
        b.endTime,
      );
      expect(
        availability.isAvailableInContext(
          context,
          f.professional.id,
          b.startTime,
          b.endTime,
        ),
      ).toBe(true);
    }
  }
  it('SQL NULL legacy is unconfirmed with faithful fallback; new tenants are closed', async () => {
    const legacy = await fixture(BusinessScheduleState.LEGACY_UNCONFIRMED),
      fresh = await fixture(BusinessScheduleState.UNCONFIRMED);
    const read = await schedule.read(legacy.org.id, legacy.owner.id);
    expect(read.state).toBe('LEGACY_UNCONFIRMED');
    expect(read.zoneConfirmed).toBe(false);
    expect(read.week).toEqual(OPEN_WEEK);
    await expect(
      bookings.create(legacy.org.id, bookingDto(legacy)),
    ).resolves.toHaveProperty('id');
    await expect(
      bookings.create(fresh.org.id, bookingDto(fresh)),
    ).rejects.toThrow('disponible');
    await expect(
      publicBooking.getBookingData(fresh.org.slug),
    ).rejects.toHaveProperty('status', 404);
    await schedule.confirmZone(fresh.org.id, fresh.owner.id, {
      expectedRevision: 0,
      regionId: 'santo-domingo',
    });
    await schedule.replaceWeek(fresh.org.id, fresh.owner.id, {
      expectedRevision: 1,
      week: OPEN_WEEK,
    });
    expect((await schedule.read(fresh.org.id, fresh.owner.id)).state).toBe(
      'CONFIRMED',
    );
  });
  it('normalizes adjacent global spans and supports midnight without crossing it', async () => {
    const f = await fixture();
    await schedule.replaceWeek(f.org.id, f.owner.id, {
      expectedRevision: 0,
      week: OPEN_WEEK.map((d) => ({
        ...d,
        windows: [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '12:00', endTime: '24:00' },
        ],
      })),
    });
    expect(
      await db.businessScheduleWindow.count({
        where: { organizationId: f.org.id },
      }),
    ).toBe(7);
    await expect(
      bookings.create(f.org.id, bookingDto(f, '2099-01-06T03:30:00.000Z')),
    ).resolves.toHaveProperty('id');
    await expect(
      bookings.create(f.org.id, bookingDto(f, '2099-01-07T03:45:00.000Z')),
    ).rejects.toThrow('disponible');
  });
  it.each(['PENDING', 'CONFIRMED'] as const)(
    'rejects a whole change for %s in progress and beyond 366 days',
    async (status) => {
      const f = await fixture();
      await schedule.replaceWeek(f.org.id, f.owner.id, {
        expectedRevision: 0,
        week: OPEN_WEEK.map((d) => ({
          ...d,
          windows: [{ startTime: '00:00', endTime: '24:00' }],
        })),
      });
      const now = Date.now();
      await rawBooking(
        f,
        status,
        new Date(now - 600000),
        new Date(now + 600000),
      );
      await rawBooking(f, status);
      const before = await snapshot(f);
      await expect(
        schedule.replaceWeek(f.org.id, f.owner.id, {
          expectedRevision: 1,
          week: CLOSED_WEEK,
        }),
      ).rejects.toHaveProperty('status', 409);
      expect(await snapshot(f)).toEqual(before);
      const impact = await schedule.previewWeek(
        f.org.id,
        f.owner.id,
        { expectedRevision: 1, week: CLOSED_WEEK },
        Object.assign(new SchedulePageDto(), { offset: 1, limit: 1 }),
      );
      expect(impact.conflictCount).toBe(2);
      expect(impact.conflicts.items).toHaveLength(1);
      expect(JSON.stringify(impact)).not.toContain('Controlled client');
    },
  );
  it('A2 protects in-progress bookings and retains all shifts after global changes', async () => {
    const f = await fixture();
    await schedule.replaceWeek(f.org.id, f.owner.id, {
      expectedRevision: 0,
      week: OPEN_WEEK.map((d) => ({
        ...d,
        windows: [{ startTime: '00:00', endTime: '24:00' }],
      })),
    });
    const now = Date.now();
    await rawBooking(
      f,
      'PENDING',
      new Date(now - 60000),
      new Date(now + 600000),
    );
    await expect(
      availability.replaceWeeklySchedule(
        f.professional.id,
        f.org.id,
        f.owner.id,
        { shifts: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }] },
      ),
    ).rejects.toHaveProperty('status', 409);
    await expect(
      availability.createBlock(f.professional.id, f.org.id, f.owner.id, {
        startTime: new Date(now - 60000).toISOString(),
        endTime: new Date(now + 600000).toISOString(),
      }),
    ).rejects.toHaveProperty('status', 409);
  });
  it('cancelled does not protect while completed/no-show keep occupancy/history', async () => {
    const f = await fixture();
    const cancelled = await rawBooking(f, 'CANCELLED');
    const completed = await rawBooking(
      f,
      'COMPLETED',
      new Date('2099-01-05T15:00Z'),
      new Date('2099-01-05T15:30Z'),
    );
    const noShow = await rawBooking(
      f,
      'NO_SHOW',
      new Date('2099-01-05T16:00Z'),
      new Date('2099-01-05T16:30Z'),
    );
    await schedule.replaceWeek(f.org.id, f.owner.id, {
      expectedRevision: 0,
      week: CLOSED_WEEK,
    });
    expect(
      (await db.booking.findUniqueOrThrow({ where: { id: cancelled.id } }))
        .status,
    ).toBe('CANCELLED');
    expect(
      (await db.booking.findUniqueOrThrow({ where: { id: completed.id } }))
        .status,
    ).toBe('COMPLETED');
    expect(
      (await db.booking.findUniqueOrThrow({ where: { id: noShow.id } })).status,
    ).toBe('NO_SHOW');
    expect(
      await bookings.findActiveBookingsInRange(
        f.org.id,
        [f.professional.id],
        new Date('2099-01-05T00:00Z'),
        new Date('2099-01-06T00:00Z'),
      ),
    ).toHaveLength(2);
    await expect(
      bookings.updateStatus(cancelled.id, f.org.id, {
        status: BookingStatus.PENDING,
      }),
    ).rejects.toHaveProperty('status', 409);
  });
  it('overlapping closures form a union; cancellation does not cancel another or future hires', async () => {
    const f = await fixture();
    const a = await schedule.createClosure(f.org.id, f.owner.id, closureDto());
    const b = await schedule.createClosure(f.org.id, f.owner.id, {
      ...closureDto(1),
      startTime: '10:30',
      endTime: '12:00',
    });
    await schedule.cancelClosure(f.org.id, f.owner.id, a.closureId!, {
      expectedRevision: 2,
    });
    const later = await db.professional.create({
      data: {
        organizationId: f.org.id,
        name: 'Later hire',
        isPublic: true,
        status: 'ACTIVE',
      },
    });
    await expect(
      bookings.create(f.org.id, {
        ...bookingDto(f, '2099-01-05T15:00:00.000Z'),
        professionalId: later.id,
      }),
    ).rejects.toHaveProperty('status', 409);
    await expect(
      bookings.create(f.org.id, bookingDto(f, '2099-01-05T14:00:00.000Z')),
    ).resolves.toHaveProperty('id');
    expect(
      (
        await db.businessClosure.findUniqueOrThrow({
          where: { id: b.closureId },
        })
      ).status,
    ).toBe('ACTIVE');
    expect(
      (
        await schedule.closures(
          f.org.id,
          f.owner.id,
          Object.assign(new SchedulePageDto(), { includeCancelled: 'true' }),
        )
      ).total,
    ).toBe(2);
    const history = await db.businessScheduleRevision.findMany({
      where: { organizationId: f.org.id },
    });
    expect(JSON.stringify(history)).not.toContain('Private reason');
  });
  it('full multiday and partial closures reject impossible dates/ambiguous clocks', async () => {
    const f = await fixture();
    await schedule.createClosure(f.org.id, f.owner.id, {
      expectedRevision: 0,
      startDate: '2099-01-05',
      endDate: '2099-01-07',
      startTime: '00:00',
      endTime: '24:00',
    });
    await expect(
      bookings.create(f.org.id, bookingDto(f, '2099-01-07T14:00:00.000Z')),
    ).rejects.toHaveProperty('status', 409);
    await expect(
      schedule.createClosure(f.org.id, f.owner.id, {
        ...closureDto(1),
        startDate: '2026-02-29',
      }),
    ).rejects.toHaveProperty('status', 400);
    const ny = await fixture(
      BusinessScheduleState.CONFIRMED,
      'America/New_York',
    );
    await expect(
      schedule.createClosure(ny.org.id, ny.owner.id, {
        expectedRevision: 0,
        startDate: '2026-11-01',
        endDate: '2026-11-01',
        startTime: '01:30',
        endTime: '03:00',
      }),
    ).rejects.toHaveProperty('status', 400);
    await expect(
      availability.createBlock(ny.professional.id, ny.org.id, ny.owner.id, {
        startTime: '2026-11-01T05:30:00Z',
        endTime: '2026-11-01T08:00:00Z',
      }),
    ).rejects.toHaveProperty('status', 400);
  });
  it('public slots preserve H5, privacy, cadence, custom intersection and eligibility', async () => {
    const f = await fixture();
    await availability.replaceWeeklySchedule(
      f.professional.id,
      f.org.id,
      f.owner.id,
      {
        shifts: [
          { dayOfWeek: 1, startTime: '09:15', endTime: '12:00' },
          { dayOfWeek: 1, startTime: '13:00', endTime: '24:00' },
        ],
      },
    );
    await schedule.replaceWeek(f.org.id, f.owner.id, {
      expectedRevision: 0,
      week: OPEN_WEEK.map((d) => ({
        ...d,
        windows: [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '13:10', endTime: '19:00' },
        ],
      })),
    });
    await schedule.createClosure(f.org.id, f.owner.id, {
      ...closureDto(1),
      startTime: '14:00',
      endTime: '15:00',
    });
    const data = await publicBooking.getBookingData(f.org.slug);
    expect(data.minimumBookingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(JSON.stringify(data)).not.toContain(f.org.id);
    // F0-D/2A approved the technical zone at the root only (BACKEND_CHANGES, 2026-10-01).
    // Preserve H5 privacy on every other field; do not remove the contract's zone.
    const { timeZone, ...publicProjection } = data;
    expect(timeZone).toBe(f.org.timeZone);
    expect(JSON.stringify(publicProjection)).not.toContain('America/');
    const slots = await publicBooking.getAvailability(f.org.slug, {
      date: '2099-01-05',
      serviceId: f.service.id,
    });
    expect(slots.slots[0].time).toBe('09:30');
    expect(slots.slots.some((s) => s.time === '13:10')).toBe(true);
    expect(slots.slots.some((s) => s.time === '15:00')).toBe(false);
    expect(slots.slots.some((s) => s.time === '15:10')).toBe(true);
    expect(JSON.stringify(slots)).not.toContain('Private reason');
    expect(new Set(slots.slots.map((s) => s.startTime)).size).toBe(
      slots.slots.length,
    );
    await expect(
      bookings.create(f.org.id, bookingDto(f, '2099-01-05T13:17:00.000Z')),
    ).resolves.toHaveProperty('id');
  });
  it('minimal staff projection omits closure reasons; managers/zone permissions and tenant IDs are enforced', async () => {
    const f = await fixture(),
      other = await fixture();
    const closure = await schedule.createClosure(
      f.org.id,
      f.owner.id,
      closureDto(),
    );
    for (const role of [
      UserRole.ADMIN,
      UserRole.RECEPTIONIST,
      UserRole.BARBER,
      UserRole.CUSTOMER,
    ]) {
      const user = await db.user.create({
        data: {
          name: role,
          email: `${randomUUID()}@test.invalid`,
          memberships: { create: { organizationId: f.org.id, role } },
        },
      });
      if (role === UserRole.CUSTOMER) {
        await expect(schedule.read(f.org.id, user.id)).rejects.toHaveProperty(
          'status',
          403,
        );
        continue;
      }
      const list = await schedule.closures(
        f.org.id,
        user.id,
        new SchedulePageDto(),
      );
      if (role !== UserRole.ADMIN)
        expect(JSON.stringify(list)).not.toContain('Private reason');
      await expect(
        schedule.confirmZone(f.org.id, user.id, {
          expectedRevision: 1,
          regionId: 'santo-domingo',
        }),
      ).rejects.toHaveProperty('status', 403);
      if (role !== UserRole.ADMIN)
        await expect(
          schedule.replaceWeek(f.org.id, user.id, {
            expectedRevision: 1,
            week: OPEN_WEEK,
          }),
        ).rejects.toHaveProperty('status', 403);
    }
    await expect(
      schedule.cancelClosure(other.org.id, other.owner.id, closure.closureId!, {
        expectedRevision: 0,
      }),
    ).rejects.toHaveProperty('status', 404);
    await expect(
      schedule.cancelClosure(other.org.id, other.owner.id, randomUUID(), {
        expectedRevision: 0,
      }),
    ).rejects.toHaveProperty('status', 404);
  });
  it.each(['history', 'block', 'closure', 'sealed-promotion'] as const)(
    'D9 freezes zone with %s even without future bookings',
    async (dependency) => {
      const f = await fixture();
      if (dependency === 'history')
        await rawBooking(
          f,
          'CANCELLED',
          new Date('2000-01-05T14:00Z'),
          new Date('2000-01-05T14:30Z'),
        );
      if (dependency === 'block')
        await db.professionalAvailabilityBlock.create({
          data: {
            organizationId: f.org.id,
            professionalId: f.professional.id,
            startTime: new Date('2000-01-05T14:00Z'),
            endTime: new Date('2000-01-05T14:30Z'),
            status: 'CANCELLED',
          },
        });
      if (dependency === 'closure')
        await schedule.createClosure(f.org.id, f.owner.id, closureDto());
      if (dependency === 'sealed-promotion')
        await db.mediaPromotion.create({
          data: {
            organizationId: f.org.id,
            draftTitle: 'Editorial title',
            draftBody: 'Controlled editorial text',
            draftStartDate: '2000-01-01',
            draftEndDate: '2000-01-02',
            publishedRevision: 1,
            timeZone: f.org.timeZone,
            startsAtUtc: new Date('2000-01-01T04:00Z'),
            endsAtUtc: new Date('2000-01-03T04:00Z'),
            retiredAt: new Date(),
          },
        });
      const revision = dependency === 'closure' ? 1 : 0;
      await expect(
        schedule.confirmZone(f.org.id, f.owner.id, {
          expectedRevision: revision,
          regionId: 'new-york',
        }),
      ).rejects.toHaveProperty('status', 409);
      await expect(
        schedule.confirmZone(f.org.id, f.owner.id, {
          expectedRevision: revision,
          regionId: 'santo-domingo',
        }),
      ).resolves.toHaveProperty('zoneConfirmed', true);
    },
  );
  it('two editors cannot overwrite a revision', async () => {
    const f = await fixture();
    const results = await Promise.allSettled([
      schedule.replaceWeek(f.org.id, f.owner.id, {
        expectedRevision: 0,
        week: OPEN_WEEK,
      }),
      schedule.replaceWeek(f.org.id, f.owner.id, {
        expectedRevision: 0,
        week: CLOSED_WEEK,
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      await db.businessScheduleRevision.count({
        where: { organizationId: f.org.id },
      }),
    ).toBe(1);
  });
  it.each([
    'internal',
    'public',
    'reschedule',
    'reactivate',
    'individual',
  ] as const)(
    'serializes narrowing against %s without impossible commitments',
    async (kind) => {
      for (let repetition = 0; repetition < 3; repetition++) {
        const f = await fixture();
        let operation: Promise<unknown>;
        if (kind === 'reschedule') {
          const existing = await rawBooking(
            f,
            'PENDING',
            new Date('2099-01-06T14:00Z'),
            new Date('2099-01-06T14:30Z'),
          );
          operation = bookings.reschedule(existing.id, f.org.id, {
            startTime: '2099-01-05T14:00:00.000Z',
          });
        } else if (kind === 'reactivate') {
          const existing = await rawBooking(f, 'CANCELLED');
          operation = bookings.updateStatus(existing.id, f.org.id, {
            status: BookingStatus.PENDING,
          });
        } else if (kind === 'public')
          operation = publicBooking.createBooking(f.org.slug, {
            serviceId: f.service.id,
            professionalId: f.professional.id,
            startTime: '2099-01-05T14:00:00.000Z',
            clientName: 'Controlled client',
            clientPhone: '+18095550101',
          });
        else if (kind === 'individual')
          operation = availability.replaceWeeklySchedule(
            f.professional.id,
            f.org.id,
            f.owner.id,
            {
              shifts: [{ dayOfWeek: 1, startTime: '10:00', endTime: '12:00' }],
            },
          );
        else operation = bookings.create(f.org.id, bookingDto(f));
        const results = await Promise.allSettled([
          operation,
          schedule.createClosure(f.org.id, f.owner.id, closureDto()),
        ]);
        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(
          kind === 'individual' ? 2 : 1,
        );
        await assertAvailableExisting(f);
      }
    },
  );
  it('serializes initial zone against first booking; all resulting instants remain unchanged', async () => {
    for (let repetition = 0; repetition < 5; repetition++) {
      const f = await fixture();
      const results = await Promise.allSettled([
        bookings.create(f.org.id, bookingDto(f, '2099-01-05T13:00:00.000Z')),
        schedule.confirmZone(f.org.id, f.owner.id, {
          expectedRevision: 0,
          regionId: 'new-york',
        }),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      await assertAvailableExisting(f);
    }
  });
  it('waiting on tenant A does not block writes to tenant B', async () => {
    const a = await fixture(),
      b = await fixture();
    let release!: () => void;
    let ready!: () => void;
    const held = new Promise<void>((r) => {
        release = r;
      }),
      locked = new Promise<void>((r) => {
        ready = r;
      });
    const holder = db.$transaction(
      async (tx) => {
        await lockOrganizationSchedule(tx, a.org.id);
        ready();
        await held;
      },
      { timeout: 10000 },
    );
    await locked;
    try {
      await expect(
        schedule.replaceWeek(b.org.id, b.owner.id, {
          expectedRevision: 0,
          week: OPEN_WEEK,
        }),
      ).resolves.toHaveProperty('revision', 1);
    } finally {
      release();
      await holder;
    }
  });
  it('a durable history failure rolls back every row; audit adapter failure is fail-open', async () => {
    const f = await fixture();
    const before = await snapshot(f);
    await db.$executeRawUnsafe(
      `REVOKE INSERT ON "BusinessScheduleRevision" FROM kortek_runtime`,
    );
    try {
      await expect(
        schedule.replaceWeek(f.org.id, f.owner.id, {
          expectedRevision: 0,
          week: CLOSED_WEEK,
        }),
      ).rejects.toHaveProperty('status', 503);
      expect(await snapshot(f)).toEqual(before);
    } finally {
      await db.$executeRawUnsafe(
        `GRANT INSERT ON "BusinessScheduleRevision" TO kortek_runtime`,
      );
    }
    const failOpen = new BusinessScheduleService(runtimeHolder, {
      log: jest.fn().mockRejectedValue(new Error('controlled audit failure')),
    } as unknown as AuditService);
    await expect(
      failOpen.replaceWeek(f.org.id, f.owner.id, {
        expectedRevision: 0,
        week: CLOSED_WEEK,
      }),
    ).resolves.toHaveProperty('revision', 1);
  });
  it('burst writes to one tenant serialize and retain all eligible bookings', async () => {
    const f = await fixture();
    const started = performance.now();
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        bookings.create(
          f.org.id,
          bookingDto(
            f,
            `2099-01-05T${String(13 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}:00.000Z`,
          ),
        ),
      ),
    );
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    await assertAvailableExisting(f);
    console.info(
      `C1 controlled load: 8 concurrent writes, ${Math.round(performance.now() - started)}ms total`,
    );
  });
});
