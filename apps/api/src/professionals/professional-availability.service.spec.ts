import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  AvailabilityBlockStatus,
  BookingStatus,
  ProfessionalStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionalAvailabilityService } from './professional-availability.service';
import { getZonedDateParts } from './professional-availability.util';

const ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
const PROFESSIONAL_ID = '00000000-0000-4000-8000-000000000002';
const USER_ID = '00000000-0000-4000-8000-000000000003';
const BLOCK_ID = '00000000-0000-4000-8000-000000000004';
const TIME_ZONE = 'America/Santo_Domingo';
const START = new Date('2099-01-05T14:00:00.000Z');
const END = new Date('2099-01-05T14:30:00.000Z');

function createDependencies() {
  const db = {
    $queryRaw: jest.fn().mockResolvedValue([
      {
        id: PROFESSIONAL_ID,
        status: ProfessionalStatus.ACTIVE,
        isPublic: true,
      },
    ]),
    $transaction: jest.fn(),
    organization: {
      findUnique: jest.fn().mockResolvedValue({
        timeZone: TIME_ZONE,
        businessHours: null,
      }),
    },
    professional: {
      findFirst: jest.fn().mockResolvedValue({ id: PROFESSIONAL_ID }),
    },
    professionalWeeklySchedule: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    professionalAvailabilityBlock: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };
  db.$transaction.mockImplementation(
    (callback: (transaction: typeof db) => Promise<unknown>) => callback(db),
  );
  const prisma = { db };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new ProfessionalAvailabilityService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );
  return { db, audit, service };
}

describe('ProfessionalAvailabilityService', () => {
  it('returns only the explicit management contract with tenant-scoped reads', async () => {
    const { db, service } = createDependencies();
    db.professionalWeeklySchedule.findMany.mockResolvedValue([
      {
        id: 'shift-id',
        dayOfWeek: 1,
        startMinute: 540,
        endMinute: 720,
      },
    ]);

    const result = await service.getForProfessional(
      PROFESSIONAL_ID,
      ORGANIZATION_ID,
      {},
    );

    expect(db.professional.findFirst).toHaveBeenCalledWith({
      where: { id: PROFESSIONAL_ID, organizationId: ORGANIZATION_ID },
      select: { id: true },
    });
    expect(db.professionalWeeklySchedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          professionalId: PROFESSIONAL_ID,
          organizationId: ORGANIZATION_ID,
        },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        professionalId: PROFESSIONAL_ID,
        timeZone: TIME_ZONE,
        inheritsOrganizationHours: false,
        weeklySchedule: [
          {
            id: 'shift-id',
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '12:00',
          },
        ],
      }),
    );
    expect(result).not.toHaveProperty('organizationId');
  });

  it('resolves BARBER self-service only through its linked tenant profile', async () => {
    const { db, service } = createDependencies();

    await service.getForOwnProfile(USER_ID, ORGANIZATION_ID, {});

    expect(db.professional.findFirst).toHaveBeenCalledWith({
      where: { userId: USER_ID, organizationId: ORGANIZATION_ID },
      select: { id: true },
    });
  });

  it('returns the same 404 for an absent or foreign professional', async () => {
    const { db, service } = createDependencies();
    db.professional.findFirst.mockResolvedValue(null);

    await expect(
      service.getForProfessional(PROFESSIONAL_ID, ORGANIZATION_ID, {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('replaces multiple weekly shifts atomically under the shared row lock', async () => {
    const { db, audit, service } = createDependencies();

    await service.replaceWeeklySchedule(
      PROFESSIONAL_ID,
      ORGANIZATION_ID,
      USER_ID,
      {
        shifts: [
          { dayOfWeek: 1, startTime: '13:00', endTime: '17:00' },
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        ],
      },
    );

    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.professionalWeeklySchedule.deleteMany).toHaveBeenCalledWith({
      where: {
        professionalId: PROFESSIONAL_ID,
        organizationId: ORGANIZATION_ID,
      },
    });
    expect(db.professionalWeeklySchedule.createMany).toHaveBeenCalledWith({
      data: [
        {
          organizationId: ORGANIZATION_ID,
          professionalId: PROFESSIONAL_ID,
          dayOfWeek: 1,
          startMinute: 540,
          endMinute: 720,
        },
        {
          organizationId: ORGANIZATION_ID,
          professionalId: PROFESSIONAL_ID,
          dayOfWeek: 1,
          startMinute: 780,
          endMinute: 1020,
        },
      ],
    });
    expect(audit.log).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      action: 'WEEKLY_UPDATE',
      entity: 'ProfessionalAvailability',
      entityId: PROFESSIONAL_ID,
    });
  });

  it('rejects overlapping weekly shifts before writing', async () => {
    const { db, service } = createDependencies();

    await expect(
      service.replaceWeeklySchedule(PROFESSIONAL_ID, ORGANIZATION_ID, USER_ID, {
        shifts: [
          { dayOfWeek: 2, startTime: '09:00', endTime: '12:00' },
          { dayOfWeek: 2, startTime: '11:00', endTime: '14:00' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.professionalWeeklySchedule.deleteMany).not.toHaveBeenCalled();
  });

  it('returns 409 when a weekly change would invalidate an open future booking', async () => {
    const { db, service } = createDependencies();
    db.booking.findMany.mockResolvedValue([
      { startTime: START, endTime: END, status: BookingStatus.CONFIRMED },
    ]);

    await expect(
      service.replaceWeeklySchedule(PROFESSIONAL_ID, ORGANIZATION_ID, USER_ID, {
        shifts: [
          {
            dayOfWeek: getZonedDateParts(START, TIME_ZONE).dayOfWeek,
            startTime: '11:00',
            endTime: '12:00',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.professionalWeeklySchedule.deleteMany).not.toHaveBeenCalled();
  });

  it('returns 409 when an active block overlaps an open future booking', async () => {
    const { db, service } = createDependencies();
    db.booking.findFirst.mockResolvedValue({ id: 'booking-id' });

    await expect(
      service.createBlock(PROFESSIONAL_ID, ORGANIZATION_ID, USER_ID, {
        startTime: START.toISOString(),
        endTime: END.toISOString(),
        note: 'Interna',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.professionalAvailabilityBlock.create).not.toHaveBeenCalled();
  });

  it('normalizes an internal note but never writes it to AuditLog', async () => {
    const { db, audit, service } = createDependencies();
    db.professionalAvailabilityBlock.create.mockResolvedValue({
      id: BLOCK_ID,
      startTime: START,
      endTime: END,
      status: AvailabilityBlockStatus.ACTIVE,
      note: 'Vacaciones',
    });

    await service.createBlock(PROFESSIONAL_ID, ORGANIZATION_ID, USER_ID, {
      startTime: START.toISOString(),
      endTime: END.toISOString(),
      note: '  Vacaciones  ',
    });

    const createCalls: unknown =
      db.professionalAvailabilityBlock.create.mock.calls;
    expect(JSON.stringify(createCalls)).toContain('"note":"Vacaciones"');
    expect(audit.log).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      action: 'BLOCK_CREATE',
      entity: 'ProfessionalAvailability',
      entityId: BLOCK_ID,
    });
    expect(JSON.stringify(audit.log.mock.calls)).not.toContain('Vacaciones');
  });

  it('rejects an empty block PATCH', async () => {
    const { db, service } = createDependencies();

    await expect(
      service.updateBlock(
        PROFESSIONAL_ID,
        BLOCK_ID,
        ORGANIZATION_ID,
        USER_ID,
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.professionalAvailabilityBlock.update).not.toHaveBeenCalled();
  });

  it('calculates organization hours intersected with individual shifts and blocks', async () => {
    const { db, service } = createDependencies();
    const dayOfWeek = getZonedDateParts(START, TIME_ZONE).dayOfWeek;
    db.professionalWeeklySchedule.findMany.mockResolvedValue([
      {
        professionalId: PROFESSIONAL_ID,
        dayOfWeek,
        startMinute: 600,
        endMinute: 720,
      },
    ]);
    db.professionalAvailabilityBlock.findMany.mockResolvedValue([
      {
        professionalId: PROFESSIONAL_ID,
        startTime: new Date('2099-01-05T14:15:00.000Z'),
        endTime: new Date('2099-01-05T14:45:00.000Z'),
      },
    ]);

    const context = await service.getPublicContext(
      ORGANIZATION_ID,
      [PROFESSIONAL_ID],
      START,
      END,
    );

    expect(
      service.isAvailableInContext(context, PROFESSIONAL_ID, START, END),
    ).toBe(false);
    expect(db.professionalAvailabilityBlock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          professionalId: true,
          startTime: true,
          endTime: true,
        },
      }),
    );
    const blockQueries: unknown =
      db.professionalAvailabilityBlock.findMany.mock.calls;
    expect(JSON.stringify(blockQueries)).not.toContain('note');
  });
});
