import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

function createHarness() {
  const db = {
    $transaction: jest.fn(),
    organization: { findUnique: jest.fn() },
    invoice: { aggregate: jest.fn() },
    booking: { count: jest.fn(), groupBy: jest.fn() },
    professional: { findFirst: jest.fn() },
  };
  db.$transaction.mockImplementation(
    (callback: (transaction: typeof db) => Promise<unknown>) => callback(db),
  );
  return {
    db,
    service: new AnalyticsService({ db } as unknown as PrismaService),
  };
}

describe('AnalyticsService revenue by real payment date', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-25T02:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('filtra ingresos por Payment.paidAt y por el día del tenant', async () => {
    const { service, db } = createHarness();
    db.organization.findUnique.mockResolvedValue({
      timeZone: 'America/Santo_Domingo',
    });
    db.invoice.aggregate
      .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal('50') } })
      .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal('20') } })
      .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal('70') } });
    db.booking.count.mockResolvedValue(0);
    db.booking.groupBy.mockResolvedValue([]);

    await expect(
      service.getDashboard('organization-id'),
    ).resolves.toMatchObject({
      revenue: { today: 50, yesterday: 20, last7Days: 70 },
    });

    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 2_000,
      timeout: 8_000,
    });

    expect(db.invoice.aggregate).toHaveBeenNthCalledWith(1, {
      where: {
        organizationId: 'organization-id',
        payment: {
          is: {
            organizationId: 'organization-id',
            paidAt: {
              gte: new Date('2026-08-24T04:00:00.000Z'),
              lt: new Date('2026-08-25T04:00:00.000Z'),
            },
          },
        },
      },
      _sum: { amount: true },
    });
    expect(db.booking.groupBy).toHaveBeenCalledWith({
      by: ['professionalId'],
      where: {
        organizationId: 'organization-id',
        status: 'COMPLETED',
        startTime: {
          gte: new Date('2026-07-26T04:00:00.000Z'),
          lt: new Date('2026-08-25T04:00:00.000Z'),
        },
      },
      _count: { _all: true },
      orderBy: { _count: { professionalId: 'desc' } },
      take: 1,
    });
  });

  it('resuelve el profesional destacado dentro del mismo tenant y snapshot', async () => {
    const { service, db } = createHarness();
    db.organization.findUnique.mockResolvedValue({
      timeZone: 'America/Santo_Domingo',
    });
    db.invoice.aggregate.mockResolvedValue({ _sum: { amount: null } });
    db.booking.count.mockResolvedValue(0);
    db.booking.groupBy.mockResolvedValue([
      { professionalId: 'professional-id', _count: { _all: 4 } },
    ]);
    db.professional.findFirst.mockResolvedValue({
      id: 'professional-id',
      name: 'Profesional',
    });

    await expect(
      service.getDashboard('organization-id'),
    ).resolves.toMatchObject({
      topProfessional: {
        id: 'professional-id',
        name: 'Profesional',
        completedBookings: 4,
      },
    });
    expect(db.professional.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'professional-id',
        organizationId: 'organization-id',
      },
      select: { id: true, name: true },
    });
  });
});
