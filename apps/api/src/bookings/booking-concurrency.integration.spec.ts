import { randomUUID } from 'node:crypto';
import {
  AvailabilityBlockStatus,
  BookingStatus,
  Prisma,
  PrismaClient,
  ProfessionalStatus,
} from '@prisma/client';
import { isBookingScheduleConflictError } from '../common/prisma-error.util';
import { BookingsService } from './bookings.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ProfessionalAvailabilityService } from '../professionals/professional-availability.service';

const describePostgres =
  process.env.RUN_POSTGRES_INTEGRATION === '1' ? describe : describe.skip;

describePostgres('Booking PostgreSQL concurrency guarantee', () => {
  const prisma = new PrismaClient();
  const prismaService = { db: prisma } as unknown as PrismaService;
  const auditService = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuditService;
  const availabilityService = new ProfessionalAvailabilityService(
    prismaService,
    auditService,
  );
  const bookingsService = new BookingsService(
    prismaService,
    availabilityService,
  );
  const professionalsService = new ProfessionalsService(prismaService, {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuditService);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('accepts only one of two overlapping concurrent inserts', async () => {
    const suffix = randomUUID();
    const organization = await prisma.organization.create({
      data: {
        name: 'Concurrency test',
        slug: `concurrency-${suffix}`,
        email: `concurrency-${suffix}@example.com`,
      },
    });
    const [professional, service, client] = await Promise.all([
      prisma.professional.create({
        data: { organizationId: organization.id, name: 'Professional' },
      }),
      prisma.service.create({
        data: {
          organizationId: organization.id,
          name: 'Service',
          duration: 30,
          price: new Prisma.Decimal(10),
        },
      }),
      prisma.client.create({
        data: { organizationId: organization.id, name: 'Client' },
      }),
    ]);
    const startTime = new Date('2099-01-01T10:00:00.000Z');
    const endTime = new Date('2099-01-01T10:30:00.000Z');
    const bookingData = {
      organizationId: organization.id,
      professionalId: professional.id,
      serviceId: service.id,
      clientId: client.id,
      startTime,
      endTime,
      status: BookingStatus.PENDING,
    };

    try {
      let releaseFirstInsert: (() => void) | undefined;
      const firstInsertReady = new Promise<void>((resolve) => {
        releaseFirstInsert = resolve;
      });
      const firstInsert = prisma.$transaction(async (transaction) => {
        const booking = await transaction.booking.create({
          data: bookingData,
        });
        releaseFirstInsert?.();
        await new Promise((resolve) => setTimeout(resolve, 250));
        return booking;
      });

      await firstInsertReady;
      const secondInsert = prisma.booking.create({ data: bookingData });
      const results = await Promise.allSettled([firstInsert, secondInsert]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      const rejected = results.find(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      );
      expect(rejected).toBeDefined();
      expect(isBookingScheduleConflictError(rejected?.reason)).toBe(true);
    } finally {
      await prisma.booking.deleteMany({
        where: { organizationId: organization.id },
      });
      await Promise.all([
        prisma.client.delete({ where: { id: client.id } }),
        prisma.service.delete({ where: { id: service.id } }),
        prisma.professional.delete({ where: { id: professional.id } }),
      ]);
      await prisma.organization.delete({ where: { id: organization.id } });
    }
  });

  async function createIntegrityFixture(label: string) {
    const suffix = randomUUID();
    const organization = await prisma.organization.create({
      data: {
        name: `Integrity ${label}`,
        slug: `integrity-${label}-${suffix}`,
        email: `integrity-${label}-${suffix}@example.com`,
      },
    });
    const professional = await prisma.professional.create({
      data: {
        organizationId: organization.id,
        name: 'Professional',
        status: ProfessionalStatus.ACTIVE,
        isPublic: true,
      },
    });
    const service = await prisma.service.create({
      data: {
        organizationId: organization.id,
        name: 'Service',
        duration: 30,
        price: new Prisma.Decimal(10),
      },
    });
    const client = await prisma.client.create({
      data: { organizationId: organization.id, name: 'Client' },
    });
    return { organization, professional, service, client };
  }

  async function cleanupIntegrityFixture(organizationId: string) {
    await prisma.booking.deleteMany({ where: { organizationId } });
    await prisma.client.deleteMany({ where: { organizationId } });
    await prisma.service.deleteMany({ where: { organizationId } });
    await prisma.professional.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  }

  async function expectArchiveIntegrity(
    organizationId: string,
    professionalId: string,
    results: PromiseSettledResult<unknown>[],
  ) {
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);

    const [professional, futureOperationalBookings] = await Promise.all([
      prisma.professional.findUniqueOrThrow({
        where: { id: professionalId, organizationId },
      }),
      prisma.booking.count({
        where: {
          organizationId,
          professionalId,
          startTime: { gt: new Date() },
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        },
      }),
    ]);
    expect(
      professional.status === ProfessionalStatus.ARCHIVED &&
        futureOperationalBookings > 0,
    ).toBe(false);
  }

  it('serializes archive against internal creation', async () => {
    const fixture = await createIntegrityFixture('create');
    try {
      const results = await Promise.allSettled([
        professionalsService.archive(
          fixture.professional.id,
          fixture.organization.id,
          randomUUID(),
        ),
        bookingsService.create(fixture.organization.id, {
          clientId: fixture.client.id,
          professionalId: fixture.professional.id,
          serviceId: fixture.service.id,
          startTime: '2099-02-01T14:00:00.000Z',
        }),
      ]);

      await expectArchiveIntegrity(
        fixture.organization.id,
        fixture.professional.id,
        results,
      );
    } finally {
      await cleanupIntegrityFixture(fixture.organization.id);
    }
  });

  it('serializes archive against creation inside the public transaction', async () => {
    const fixture = await createIntegrityFixture('public-create');
    try {
      const results = await Promise.allSettled([
        professionalsService.archive(
          fixture.professional.id,
          fixture.organization.id,
          randomUUID(),
        ),
        prisma.$transaction((transaction) =>
          bookingsService.create(
            fixture.organization.id,
            {
              clientId: fixture.client.id,
              professionalId: fixture.professional.id,
              serviceId: fixture.service.id,
              startTime: '2099-02-01T15:00:00.000Z',
            },
            transaction,
            true,
          ),
        ),
      ]);

      await expectArchiveIntegrity(
        fixture.organization.id,
        fixture.professional.id,
        results,
      );
    } finally {
      await cleanupIntegrityFixture(fixture.organization.id);
    }
  });

  it('serializes archive against rescheduling into the future', async () => {
    const fixture = await createIntegrityFixture('reschedule');
    try {
      const booking = await prisma.booking.create({
        data: {
          organizationId: fixture.organization.id,
          professionalId: fixture.professional.id,
          serviceId: fixture.service.id,
          clientId: fixture.client.id,
          startTime: new Date('2025-01-01T10:00:00.000Z'),
          endTime: new Date('2025-01-01T10:30:00.000Z'),
          status: BookingStatus.PENDING,
        },
      });
      const results = await Promise.allSettled([
        professionalsService.archive(
          fixture.professional.id,
          fixture.organization.id,
          randomUUID(),
        ),
        bookingsService.reschedule(booking.id, fixture.organization.id, {
          startTime: '2099-02-02T14:00:00.000Z',
        }),
      ]);

      await expectArchiveIntegrity(
        fixture.organization.id,
        fixture.professional.id,
        results,
      );
    } finally {
      await cleanupIntegrityFixture(fixture.organization.id);
    }
  });

  it('serializes archive against reactivating a cancelled future booking', async () => {
    const fixture = await createIntegrityFixture('reactivate');
    try {
      const booking = await prisma.booking.create({
        data: {
          organizationId: fixture.organization.id,
          professionalId: fixture.professional.id,
          serviceId: fixture.service.id,
          clientId: fixture.client.id,
          startTime: new Date('2099-02-03T14:00:00.000Z'),
          endTime: new Date('2099-02-03T14:30:00.000Z'),
          status: BookingStatus.CANCELLED,
        },
      });
      const results = await Promise.allSettled([
        professionalsService.archive(
          fixture.professional.id,
          fixture.organization.id,
          randomUUID(),
        ),
        bookingsService.updateStatus(booking.id, fixture.organization.id, {
          status: BookingStatus.CONFIRMED,
        }),
      ]);

      await expectArchiveIntegrity(
        fixture.organization.id,
        fixture.professional.id,
        results,
      );
    } finally {
      await cleanupIntegrityFixture(fixture.organization.id);
    }
  });

  async function expectNoAvailabilityContradiction(
    organizationId: string,
    professionalId: string,
    startTime: Date,
    endTime: Date,
  ) {
    const [operationalBookings, activeBlocks] = await Promise.all([
      prisma.booking.findMany({
        where: {
          organizationId,
          professionalId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        },
      }),
      prisma.professionalAvailabilityBlock.count({
        where: {
          organizationId,
          professionalId,
          status: AvailabilityBlockStatus.ACTIVE,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      }),
    ]);
    expect(operationalBookings.length > 0 && activeBlocks > 0).toBe(false);

    if (operationalBookings.length > 0) {
      const context = await availabilityService.getPublicContext(
        organizationId,
        [professionalId],
        startTime,
        endTime,
      );
      for (const booking of operationalBookings) {
        expect(
          availabilityService.isAvailableInContext(
            context,
            professionalId,
            booking.startTime,
            booking.endTime,
          ),
        ).toBe(true);
      }
    }
  }

  it('serializes weekly schedule replacement against booking creation', async () => {
    const fixture = await createIntegrityFixture('availability-schedule');
    const startTime = new Date('2099-02-05T14:00:00.000Z');
    const endTime = new Date('2099-02-05T14:30:00.000Z');
    try {
      const results = await Promise.allSettled([
        availabilityService.replaceWeeklySchedule(
          fixture.professional.id,
          fixture.organization.id,
          randomUUID(),
          {
            shifts: [{ dayOfWeek: 4, startTime: '12:00', endTime: '13:00' }],
          },
        ),
        bookingsService.create(fixture.organization.id, {
          clientId: fixture.client.id,
          professionalId: fixture.professional.id,
          serviceId: fixture.service.id,
          startTime: startTime.toISOString(),
        }),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      await expectNoAvailabilityContradiction(
        fixture.organization.id,
        fixture.professional.id,
        startTime,
        endTime,
      );
    } finally {
      await cleanupIntegrityFixture(fixture.organization.id);
    }
  });

  it('enforces tenant ownership for availability rows at PostgreSQL level', async () => {
    const first = await createIntegrityFixture('availability-tenant-a');
    const second = await createIntegrityFixture('availability-tenant-b');
    try {
      await expect(
        prisma.professionalWeeklySchedule.create({
          data: {
            organizationId: first.organization.id,
            professionalId: second.professional.id,
            dayOfWeek: 1,
            startMinute: 540,
            endMinute: 600,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
    } finally {
      await cleanupIntegrityFixture(first.organization.id);
      await cleanupIntegrityFixture(second.organization.id);
    }
  });

  it('serializes an active block against rescheduling into its range', async () => {
    const fixture = await createIntegrityFixture('availability-reschedule');
    const startTime = new Date('2099-02-06T14:00:00.000Z');
    const endTime = new Date('2099-02-06T14:30:00.000Z');
    try {
      const booking = await prisma.booking.create({
        data: {
          organizationId: fixture.organization.id,
          professionalId: fixture.professional.id,
          serviceId: fixture.service.id,
          clientId: fixture.client.id,
          startTime: new Date('2025-01-01T14:00:00.000Z'),
          endTime: new Date('2025-01-01T14:30:00.000Z'),
          status: BookingStatus.PENDING,
        },
      });
      const results = await Promise.allSettled([
        availabilityService.createBlock(
          fixture.professional.id,
          fixture.organization.id,
          randomUUID(),
          {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            note: 'Internal only',
          },
        ),
        bookingsService.reschedule(booking.id, fixture.organization.id, {
          startTime: startTime.toISOString(),
        }),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      await expectNoAvailabilityContradiction(
        fixture.organization.id,
        fixture.professional.id,
        startTime,
        endTime,
      );
    } finally {
      await cleanupIntegrityFixture(fixture.organization.id);
    }
  });

  it('serializes an active block against reactivating a cancelled booking', async () => {
    const fixture = await createIntegrityFixture('availability-reactivate');
    const startTime = new Date('2099-02-07T14:00:00.000Z');
    const endTime = new Date('2099-02-07T14:30:00.000Z');
    try {
      const booking = await prisma.booking.create({
        data: {
          organizationId: fixture.organization.id,
          professionalId: fixture.professional.id,
          serviceId: fixture.service.id,
          clientId: fixture.client.id,
          startTime,
          endTime,
          status: BookingStatus.CANCELLED,
        },
      });
      const results = await Promise.allSettled([
        availabilityService.createBlock(
          fixture.professional.id,
          fixture.organization.id,
          randomUUID(),
          {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          },
        ),
        bookingsService.updateStatus(booking.id, fixture.organization.id, {
          status: BookingStatus.CONFIRMED,
        }),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      await expectNoAvailabilityContradiction(
        fixture.organization.id,
        fixture.professional.id,
        startTime,
        endTime,
      );
    } finally {
      await cleanupIntegrityFixture(fixture.organization.id);
    }
  });
});
