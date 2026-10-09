import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { validate } from 'class-validator';
import { PublicBookingService } from './public-booking.service';
import { GetAvailabilityDaysQueryDto } from './dto/get-availability-days-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { AuditService } from '../audit/audit.service';
import { ProfessionalAvailabilityService } from '../professionals/professional-availability.service';

describe('M1 C1 — rango público', () => {
  const serviceId = '00000000-0000-4000-8000-000000000004';
  const query = { serviceId, from: '2099-01-01', to: '2099-01-31' };
  function setup() {
    const org = {
      id: 'tenant-A',
      slug: 'a',
      isActive: true,
      deletedAt: null,
      timeZone: 'America/Santo_Domingo',
      businessHours: null,
      cmsPage: { isPublished: true, publishedSnapshot: {} },
      businessSchedule: {
        state: 'CONFIRMED',
        zoneConfirmed: true,
        legacyPublicAllowed: false,
        revision: 0,
        closures: [],
        days: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          windows: [{ startMinute: 540, endMinute: 600 }],
        })),
      },
    };
    const tx = {
      organization: { findUnique: jest.fn().mockResolvedValue(org) },
      service: { findFirst: jest.fn().mockResolvedValue({ duration: 30 }) },
      professional: {
        findMany: jest.fn().mockResolvedValue([{ id: 'pro-A' }]),
        findFirst: jest.fn().mockResolvedValue({ id: 'pro-A' }),
      },
      professionalWeeklySchedule: { findMany: jest.fn().mockResolvedValue([]) },
      professionalAvailabilityBlock: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const prisma = {
      db: {
        ...tx,
        $transaction: jest.fn(async (fn: (db: typeof tx) => Promise<unknown>) =>
          fn(tx),
        ),
      },
    };
    const bookings = {
      findActiveBookingsInRange: jest.fn().mockResolvedValue([]),
    };
    const availability = new ProfessionalAvailabilityService(
      prisma as unknown as PrismaService,
      {} as AuditService,
    );
    const service = new PublicBookingService(
      prisma as unknown as PrismaService,
      bookings as unknown as BookingsService,
      {} as AuditService,
      availability,
    );
    return { org, tx, prisma, bookings, availability, service };
  }

  afterEach(() => jest.useRealTimers());

  it('carga el rango una vez en un snapshot, corta por día y coincide con slots', async () => {
    const s = setup();
    const evaluate = jest.spyOn(s.availability, 'isAvailableInContext');
    const days = await s.service.getAvailabilityDays('a', query);
    expect(days.availableDates).toHaveLength(31);
    expect(evaluate).toHaveBeenCalledTimes(31);
    expect(s.prisma.db.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    expect(s.tx.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: serviceId, organizationId: 'tenant-A', isActive: true },
      }),
    );
    expect(s.tx.professionalWeeklySchedule.findMany).toHaveBeenCalledTimes(1);
    expect(s.tx.professionalAvailabilityBlock.findMany).toHaveBeenCalledTimes(
      1,
    );
    expect(s.bookings.findActiveBookingsInRange).toHaveBeenCalledWith(
      'tenant-A',
      ['pro-A'],
      expect.any(Date),
      expect.any(Date),
      s.tx,
    );
    const daily = await s.service.getAvailability('a', {
      serviceId,
      date: query.from,
    });
    expect(daily.slots).toEqual([
      {
        time: '09:00',
        professionalId: 'pro-A',
        startTime: '2099-01-01T13:00:00.000Z',
      },
      {
        time: '09:30',
        professionalId: 'pro-A',
        startTime: '2099-01-01T13:30:00.000Z',
      },
    ]);
  });

  it.each([
    ['2099-01-01', '2099-02-01'],
    ['2099-02-01', '2099-01-01'],
    ['2099-02-29', '2099-03-01'],
    ['2099-1-01', '2099-01-02'],
    ['0000-01-01', '0000-01-01'],
    ['9999-12-31', '9999-12-31'],
  ])('rechaza rango inválido %s..%s sin consultas', async (from, to) => {
    const s = setup();
    await expect(
      s.service.getAvailabilityDays('a', { ...query, from, to }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(s.prisma.db.$transaction).not.toHaveBeenCalled();
  });

  it('el mínimo es el día del negocio y descarta comienzos pasados con un ahora fijo', async () => {
    jest.useFakeTimers({
      doNotFake: ['nextTick', 'setImmediate', 'setTimeout'],
    });
    jest.setSystemTime(new Date('2099-01-02T03:30:00Z'));
    const s = setup();
    const result = await s.service.getAvailabilityDays('a', {
      ...query,
      to: query.from,
    });
    expect(result.availableDates).toEqual([]); // Sigue siendo 1 de enero en el negocio.
    await expect(
      s.service.getAvailabilityDays('a', { ...query, from: '2098-12-31' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    jest.setSystemTime(new Date('2099-01-01T13:00:00Z'));
    expect(
      (await s.service.getAvailabilityDays('a', { ...query, to: query.from }))
        .availableDates,
    ).toEqual([query.from]);
    s.tx.service.findFirst.mockResolvedValue({ duration: 60 });
    expect(
      (await s.service.getAvailabilityDays('a', { ...query, to: query.from }))
        .availableDates,
    ).toEqual([]);
  });

  it('sin profesionales devuelve vacío; selección ajena/inexistente se rechaza igual', async () => {
    const s = setup();
    s.tx.professional.findMany.mockResolvedValue([]);
    expect(
      (await s.service.getAvailabilityDays('a', query)).availableDates,
    ).toEqual([]);
    expect(s.bookings.findActiveBookingsInRange).not.toHaveBeenCalled();
    for (const professionalId of ['foreign', 'missing']) {
      await expect(
        s.service.getAvailabilityDays('a', { ...query, professionalId }),
      ).rejects.toThrow('Profesional no encontrado en esta barbería');
    }
  });

  it('fallo de DB, corrupción de política y zona inválida nunca aparentan vacío', async () => {
    const s = setup();
    s.bookings.findActiveBookingsInRange.mockRejectedValue(
      new Error('private database detail'),
    );
    await expect(
      s.service.getAvailabilityDays('a', query),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    s.org.businessSchedule.days = [];
    await expect(
      s.service.getAvailabilityDays('a', query),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    s.org.timeZone = 'Invalid/private';
    await expect(s.service.getAvailabilityDays('a', query)).rejects.toThrow(
      'No fue posible calcular la fecha del negocio.',
    );
  });

  it('retirado o inexistente devuelve el mismo 404 neutro', async () => {
    const s = setup();
    s.org.cmsPage.isPublished = false;
    await expect(
      s.service.getAvailabilityDays('a', query),
    ).rejects.toBeInstanceOf(NotFoundException);
    s.tx.organization.findUnique.mockResolvedValue(null);
    await expect(s.service.getAvailabilityDays('a', query)).rejects.toThrow(
      'Información no disponible.',
    );
  });

  it.each([0, -30, 1.5])(
    'duración corrupta %s falla cerrada, no como calendario vacío',
    async (duration) => {
      const s = setup();
      s.tx.service.findFirst.mockResolvedValue({ duration });
      await expect(
        s.service.getAvailabilityDays('a', query),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(s.tx.professional.findMany).not.toHaveBeenCalled();
    },
  );

  it('DTO valida fechas estrictas y UUID', async () => {
    const valid = Object.assign(new GetAvailabilityDaysQueryDto(), query);
    expect(await validate(valid)).toEqual([]);
    const invalid = Object.assign(new GetAvailabilityDaysQueryDto(), {
      ...query,
      from: '2099-02-29',
      serviceId: 'invalid',
      professionalId: 'invalid',
    });
    expect((await validate(invalid)).map((e) => e.property).sort()).toEqual([
      'from',
      'professionalId',
      'serviceId',
    ]);
  });
});
