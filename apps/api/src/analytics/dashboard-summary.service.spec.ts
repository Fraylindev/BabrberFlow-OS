import { ServiceUnavailableException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardSummaryService } from './dashboard-summary.service';
import { SummaryQueryDto } from './dto/summary-query.dto';

function harness() {
  const db = {
    $transaction: jest.fn(),
    organization: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ timeZone: 'America/Santo_Domingo' }),
    },
    professional: {
      findFirst: jest.fn().mockResolvedValue({ id: 'own' }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(25),
    },
    booking: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(31),
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };
  db.$transaction.mockImplementation(
    (fn: (tx: typeof db) => Promise<unknown>) => fn(db),
  );
  return {
    db,
    service: new DashboardSummaryService({ db } as unknown as PrismaService),
  };
}
const user = {
  id: 'user',
  organizationId: 'tenant',
  role: UserRole.OWNER,
  name: 'Test',
  email: 'test@example.test',
};

describe('DashboardSummaryService', () => {
  beforeEach(() =>
    jest.useFakeTimers().setSystemTime(new Date('2026-08-25T02:00:00Z')),
  );
  afterEach(() => jest.useRealTimers());

  it('filters business today before paging and counts the entire set in one bounded snapshot', async () => {
    const { db, service } = harness();
    const result = await service.getSummary(user, {
      agendaPage: 2,
      workloadPage: 2,
    });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
      maxWait: 2000,
      timeout: 8000,
    });
    expect(db.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'tenant',
          startTime: {
            gte: new Date('2026-08-24T04:00:00Z'),
            lt: new Date('2026-08-25T04:00:00Z'),
          },
        },
        skip: 20,
        take: 20,
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(result.agenda).toMatchObject({
      total: 31,
      completed: 31,
      totalPages: 2,
      page: 2,
    });
    expect(result.workload).toMatchObject({
      total: 25,
      idleCount: 25,
      totalPages: 2,
    });
    expect(db.professional.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        where: { organizationId: 'tenant', status: 'ACTIVE' },
      }),
    );
  });

  it('returns only the linked BARBER agenda without querying global counts or professionals', async () => {
    const { db, service } = harness();
    const result = await service.getSummary(
      { ...user, role: UserRole.BARBER },
      new SummaryQueryDto(),
    );
    expect(db.professional.findFirst).toHaveBeenCalledWith({
      where: { organizationId: 'tenant', userId: 'user' },
      select: { id: true },
    });
    expect(db.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'tenant',
          professionalId: { in: ['own'] },
          startTime: {
            gte: new Date('2026-08-24T04:00:00Z'),
            lt: new Date('2026-08-25T04:00:00Z'),
          },
        },
      }),
    );
    expect(result.workload).toBeNull();
    expect(result.isBrandNew).toBe(false);
    expect(db.professional.count).not.toHaveBeenCalled();
    expect(db.professional.findMany).not.toHaveBeenCalled();
  });

  it('fails closed to an empty scope for a BARBER without a link', async () => {
    const { db, service } = harness();
    db.professional.findFirst.mockResolvedValue(null);
    await service.getSummary(
      { ...user, role: UserRole.BARBER },
      new SummaryQueryDto(),
    );
    expect(db.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'tenant',
          professionalId: { in: [] },
          startTime: {
            gte: new Date('2026-08-24T04:00:00Z'),
            lt: new Date('2026-08-25T04:00:00Z'),
          },
        },
      }),
    );
  });

  it('uses the actual 23-hour business day across DST', async () => {
    jest.setSystemTime(new Date('2026-03-08T16:00:00Z'));
    const { db, service } = harness();
    db.organization.findUnique.mockResolvedValue({
      timeZone: 'America/New_York',
    });
    await service.getSummary(user, new SummaryQueryDto());
    expect(db.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'tenant',
          startTime: {
            gte: new Date('2026-03-08T05:00:00Z'),
            lt: new Date('2026-03-09T04:00:00Z'),
          },
        },
      }),
    );
  });

  it('rejects invalid business configuration before querying bookings', async () => {
    const { db, service } = harness();
    db.organization.findUnique.mockResolvedValue({ timeZone: 'invalid' });
    await expect(
      service.getSummary(user, new SummaryQueryDto()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(db.booking.findMany).not.toHaveBeenCalled();
  });

  it('does not turn timeouts or database errors into successful empty data or expose internals', async () => {
    const { db, service } = harness();
    db.$transaction.mockRejectedValue(new Error('private database detail'));
    await expect(
      service.getSummary(user, new SummaryQueryDto()),
    ).rejects.toThrow(
      'No pudimos cargar la agenda del día. Vuelve a intentarlo.',
    );
  });
});
