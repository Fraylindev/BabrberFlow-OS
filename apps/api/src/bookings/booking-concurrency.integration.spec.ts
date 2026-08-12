import { randomUUID } from 'node:crypto';
import { BookingStatus, Prisma, PrismaClient } from '@prisma/client';
import { isBookingScheduleConflictError } from '../common/prisma-error.util';

const describePostgres =
  process.env.RUN_POSTGRES_INTEGRATION === '1' ? describe : describe.skip;

describePostgres('Booking PostgreSQL concurrency guarantee', () => {
  const prisma = new PrismaClient();

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
});
