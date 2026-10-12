import { runInNewContext } from 'node:vm';
import { Logger, NotFoundException } from '@nestjs/common';
import { CalendarService, calendarDates } from './calendar.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { ProfessionalAvailabilityService } from '../professionals/professional-availability.service';
import { UserRole } from '@prisma/client';
import { CalendarQueryDto, CalendarRescheduleDto } from './dto/calendar.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as presentation from '../common/business-time.presentation';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
describe('M3 pure contract', () => {
  it.each([
    ['2026-02-30', '2026-03-01'],
    ['2026-10-10', '2026-10-10'],
    ['2026-10-10', '2026-10-18'],
    ['2026-10-11', '2026-10-10'],
  ])('rejects invalid calendar range %s %s', (from, to) =>
    expect(() => calendarDates(from, to, 7)).toThrow(),
  );
  it('counts civil days across year boundary', () =>
    expect(calendarDates('2026-12-29', '2027-01-05', 7)).toHaveLength(7));
  it('selector inclusive 31 / 32 days', () => {
    expect(calendarDates('2026-10-01', '2026-10-31', 31, true)).toHaveLength(
      31,
    );
    expect(() => calendarDates('2026-10-01', '2026-11-01', 31, true)).toThrow();
  });
  it('rejects unknown fields and absent revision/zone', async () => {
    expect(
      await validate(
        plainToInstance(CalendarRescheduleDto, {
          startTime: '2026-12-01T10:00:00',
          expectedUpdatedAt: '2026-10-10T00:00:00Z',
          organizationId: 'forged',
        }),
        { whitelist: true, forbidNonWhitelisted: true },
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(CalendarQueryDto, {
          from: '2026-10-10',
          to: '2026-10-11',
          limit: 201,
        }),
      ),
    ).not.toHaveLength(0);
  });
  it('shared pure formatter preserves existing web vectors including unusual days', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../web/lib/business-time.ts'),
      'utf8',
    );
    const code = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
      },
    }).outputText;
    const exports: typeof presentation = {} as typeof presentation;
    runInNewContext(code, { exports });
    const now = new Date('2026-10-10T03:00:00Z');
    for (const zone of [
      'America/Santo_Domingo',
      'America/New_York',
      'Australia/Lord_Howe',
      'Pacific/Apia',
    ])
      for (const instant of [
        '2026-10-10T02:30:00Z',
        '2026-11-01T05:30:00Z',
        '2026-03-08T07:30:00Z',
        '2027-01-01T00:00:00Z',
      ])
        expect(presentation.formatBusinessTime(instant, zone, { now })).toEqual(
          exports.formatBusinessTime(instant, zone, { now }),
        );
    expect(() =>
      presentation.formatBusinessTime('2026-10-10T00:00:00Z', 'invalid'),
    ).toThrow();
    expect(
      presentation.formatBusinessTime('2026-10-10', undefined, {
        kind: 'date',
        relative: false,
      }).fullText,
    ).toBe('10 de octubre de 2026');
    expect(presentation.formatBusinessClock('24:00')).toBe('final del día');
  });
  it('failed read is 503 with no SQL details, never empty success', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    const service = new CalendarService(
      {
        db: {
          $transaction: () => Promise.reject(new Error('private SQL detail')),
        },
      } as unknown as PrismaService,
      {} as ProfessionalAvailabilityService,
    );
    await expect(
      service.calendar(
        {
          id: 'synthetic',
          email: 'synthetic@test.invalid',
          name: 'Synthetic',
          role: UserRole.OWNER,
          organizationId: 'synthetic',
        },
        { from: '2026-10-10', to: '2026-10-11' },
      ),
    ).rejects.toMatchObject({
      status: 503,
      message:
        'No pudimos cargar la agenda o los horarios. Inténtalo de nuevo.',
    });
    expect(log).toHaveBeenCalledWith('Calendar read failed: Error');
    log.mockRestore();
  });
  it.each([
    [new TypeError('private customer and SQL details'), 'TypeError'],
    [
      Object.assign(new Error('private message'), { name: 'private customer' }),
      'Error',
    ],
    [{ name: 'private customer', message: 'private message' }, 'NonError'],
  ])('logs only a safe error type for failed reads', async (failure, name) => {
    const log = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    try {
      const service = new CalendarService(
        {
          db: { $transaction: () => Promise.reject(failure) },
        } as unknown as PrismaService,
        {} as ProfessionalAvailabilityService,
      );
      await expect(
        service.detail({} as never, 'private-booking'),
      ).rejects.toMatchObject({ status: 503 });
      expect(log.mock.calls).toEqual([[`Calendar read failed: ${name}`]]);
    } finally {
      log.mockRestore();
    }
  });
  it('preserves expected HTTP failures without logging them', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    try {
      const failure = new NotFoundException('Reserva no disponible.');
      const service = new CalendarService(
        {
          db: { $transaction: () => Promise.reject(failure) },
        } as unknown as PrismaService,
        {} as ProfessionalAvailabilityService,
      );
      await expect(service.detail({} as never, 'private-booking')).rejects.toBe(
        failure,
      );
      expect(log).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});
