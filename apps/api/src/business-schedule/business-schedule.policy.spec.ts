import { BusinessScheduleState } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  BUSINESS_REGIONS,
  candidatesForPolicy,
  insideBusinessPolicy,
  policyFromOrganization,
  type BusinessPolicyOrganization,
} from './business-schedule.policy';
import { normalizeBusinessWeek } from './business-schedule.service';
import { professionalRuleEffect } from './business-schedule.impact';
import { ReplaceBusinessWeekDto } from './business-schedule.dto';
import {
  localDateTimeOccurrences,
  utcRangeForLocalDate,
  zonedLocalDateTimeToUtc,
  legacyZonedLocalDateTimeToUtc,
} from '../professionals/professional-availability.util';

function org(
  raw: unknown,
  state: BusinessScheduleState = BusinessScheduleState.LEGACY_UNCONFIRMED,
) {
  return {
    timeZone: 'America/Santo_Domingo',
    businessHours: raw,
    businessSchedule: {
      state,
      revision: 0,
      zoneConfirmed: false,
      legacyPublicAllowed: false,
      days: [],
      closures: [],
    },
  } as unknown as BusinessPolicyOrganization;
}
const week = (windows: Array<{ startTime: string; endTime: string }>) => ({
  expectedRevision: 0,
  week: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, windows })),
});
describe('Business schedule policy D1-D15 A', () => {
  it.each([
    ['2026-03-29', 0, 23],
    ['2026-10-25', 2, 25],
  ] as const)(
    'enumerates Madrid transitions on %s',
    (date, occurrences, hours) => {
      expect(
        localDateTimeOccurrences(date, '02:30', 'Europe/Madrid'),
      ).toHaveLength(occurrences);
      const range = utcRangeForLocalDate(date, 'Europe/Madrid')!;
      expect((range.end.getTime() - range.start.getTime()) / 3600000).toBe(
        hours,
      );
    },
  );
  it.each([
    null,
    { open: '09:00', close: '09:00' },
    { open: '22:00', close: '02:00' },
    { open: '00:00', close: '24:00' },
    { monday: ['10:00', '12:00'] },
    [],
  ])('preserves the legacy fallback without confirming it: %p', (raw) => {
    const policy = policyFromOrganization(org(raw));
    expect(policy.windows).toHaveLength(7);
    expect(policy.windows[0]).toEqual({
      dayOfWeek: 0,
      startMinute: 540,
      endMinute: 1140,
    });
    expect(policy.zoneConfirmed).toBe(false);
  });
  it('preserves recognized keys and ignores extras', () => {
    expect(
      policyFromOrganization(
        org({ open: '10:13', close: '15:23', extra: 'ignored' }),
      ).windows[0],
    ).toMatchObject({ startMinute: 613, endMinute: 923 });
  });
  it('a new or corrupt confirmed tenant never falls back', () => {
    expect(
      policyFromOrganization(org(null, BusinessScheduleState.UNCONFIRMED))
        .windows,
    ).toEqual([]);
    expect(() =>
      policyFromOrganization(org(null, BusinessScheduleState.CONFIRMED)),
    ).toThrow('revisión');
  });
  it('normalizes adjacent global windows, keeps closed days and accepts end of day', () => {
    const dto = week([
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '12:00', endTime: '24:00' },
    ]);
    dto.week[0].windows = [];
    expect(normalizeBusinessWeek(dto)).toHaveLength(6);
    expect(normalizeBusinessWeek(dto)[0]).toEqual({
      dayOfWeek: 1,
      startMinute: 540,
      endMinute: 1440,
    });
    expect(normalizeBusinessWeek(week([]))).toEqual([]);
  });
  it('rejects missing/duplicate days and overlapping/inverted windows', () => {
    const dto = week([]);
    dto.week[6].dayOfWeek = 0;
    expect(() => normalizeBusinessWeek(dto)).toThrow(BadRequestException);
    expect(() =>
      normalizeBusinessWeek(week([{ startTime: '11:00', endTime: '10:00' }])),
    ).toThrow();
    expect(() =>
      normalizeBusinessWeek(
        week([
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '11:00', endTime: '13:00' },
        ]),
      ),
    ).toThrow();
  });
  it('rejects untyped fields and invalid DTO times without installing an editor', async () => {
    const dto = plainToInstance(ReplaceBusinessWeekDto, {
      ...week([{ startTime: '24:00', endTime: '24:00' }]),
      organizationId: 'injected',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
  it('anchors each global span before intersection and does not traverse breaks', () => {
    const p = policyFromOrganization(org(null));
    p.windows = [
      { dayOfWeek: 1, startMinute: 540, endMinute: 720 },
      { dayOfWeek: 1, startMinute: 780, endMinute: 1440 },
    ];
    expect(candidatesForPolicy(p, '2099-01-05', 1, 30)).toContain('23:30');
    expect(candidatesForPolicy(p, '2099-01-05', 1, 30)).not.toContain('12:00');
    expect(
      insideBusinessPolicy(
        p,
        new Date('2099-01-05T15:45Z'),
        new Date('2099-01-05T16:15Z'),
        [],
      ),
    ).toBe(false);
    expect(
      insideBusinessPolicy(
        p,
        new Date('2099-01-06T03:30Z'),
        new Date('2099-01-06T04:00Z'),
        [],
      ),
    ).toBe(true);
    expect(
      insideBusinessPolicy(
        p,
        new Date('2099-01-06T03:45Z'),
        new Date('2099-01-06T04:15Z'),
        [],
      ),
    ).toBe(false);
  });
  it('does not merge adjacent individual shifts and subtracts union of closures', () => {
    const p = policyFromOrganization(org(null));
    const start = new Date('2099-01-05T15:45Z'),
      end = new Date('2099-01-05T16:15Z');
    expect(
      insideBusinessPolicy(p, start, end, [
        { dayOfWeek: 1, startMinute: 540, endMinute: 720 },
        { dayOfWeek: 1, startMinute: 720, endMinute: 1140 },
      ]),
    ).toBe(false);
    p.closures = [
      {
        id: 'a',
        startDate: '2099-01-05',
        endDate: '2099-01-05',
        startMinute: 600,
        endMinute: 900,
      },
      {
        id: 'b',
        startDate: '2099-01-05',
        endDate: '2099-01-05',
        startMinute: 700,
        endMinute: 1000,
      },
    ];
    p.closures = p.closures.filter((c) => c.id !== 'a');
    expect(insideBusinessPolicy(p, start, end, [])).toBe(false);
  });
});
describe('Unambiguous business time D8/D10-A', () => {
  it('retains the pre-C1 ambiguous conversion only for legacy transition', () => {
    expect(
      legacyZonedLocalDateTimeToUtc('2026-11-01', '01:30', 'America/New_York'),
    ).not.toBeNull();
    expect(
      zonedLocalDateTimeToUtc('2026-11-01', '01:30', 'America/New_York'),
    ).toBeNull();
  });
  it.each(['0001-01-01', '0099-12-31', '9999-12-31'])(
    'handles calendar boundary %s without 1900 conversion or textual comparison',
    (date) => {
      expect(
        zonedLocalDateTimeToUtc(date, '12:00', 'America/Santo_Domingo'),
      ).not.toBeNull();
      const range = utcRangeForLocalDate(date, 'America/Santo_Domingo');
      expect(range).not.toBeNull();
      expect(range!.end.getTime() - range!.start.getTime()).toBe(86400000);
    },
  );
  it.each([
    ['America/New_York', '2026-03-08', '02:30', 0],
    ['America/New_York', '2026-11-01', '01:30', 2],
    ['Australia/Lord_Howe', '2026-04-05', '01:45', 2],
    ['Australia/Lord_Howe', '2026-10-04', '02:15', 0],
    ['America/Sao_Paulo', '2018-11-04', '00:00', 0],
    ['Pacific/Apia', '2011-12-30', '12:00', 0],
  ])('%s %s %s has %s occurrences', (zone, date, time, count) => {
    expect(localDateTimeOccurrences(date, time, zone)).toHaveLength(count);
    expect(zonedLocalDateTimeToUtc(date, time, zone)).toBeNull();
  });
  it.each([
    ['America/New_York', '2026-03-08', 23],
    ['America/New_York', '2026-11-01', 25],
    ['Australia/Lord_Howe', '2026-04-05', 24.5],
    ['Australia/Lord_Howe', '2026-10-04', 23.5],
    ['America/Sao_Paulo', '2018-11-04', 23],
    ['Pacific/Apia', '2011-12-29', 24],
  ])('uses actual day limits for %s %s', (zone, date, hours) => {
    const day = utcRangeForLocalDate(date, zone);
    expect(day).not.toBeNull();
    expect((day!.end.getTime() - day!.start.getTime()) / 3600000).toBe(hours);
  });
  it('rejects nonexistent dates and preserves leap-day boundaries', () => {
    expect(utcRangeForLocalDate('2011-12-30', 'Pacific/Apia')).toBeNull();
    expect(
      utcRangeForLocalDate('2026-02-29', 'America/Santo_Domingo'),
    ).toBeNull();
    expect(
      utcRangeForLocalDate('2028-02-29', 'America/Santo_Domingo'),
    ).not.toBeNull();
  });
  it('all offered regions resolve unique ordinary instants', () => {
    for (const region of BUSINESS_REGIONS)
      expect(
        zonedLocalDateTimeToUtc('2026-09-27', '12:00', region.timeZone),
      ).not.toBeNull();
  });
  it('uses real elapsed minutes across a clock jump and skips only the affected span', () => {
    const p = policyFromOrganization(org(null));
    p.state = BusinessScheduleState.CONFIRMED;
    p.timeZone = 'America/New_York';
    p.windows = [
      { dayOfWeek: 0, startMinute: 60, endMinute: 240 },
      { dayOfWeek: 0, startMinute: 120, endMinute: 180 },
      { dayOfWeek: 0, startMinute: 600, endMinute: 720 },
    ];
    expect(
      insideBusinessPolicy(
        p,
        new Date('2026-03-08T06:30Z'),
        new Date('2026-03-08T07:30Z'),
        [],
      ),
    ).toBe(true);
    expect(
      insideBusinessPolicy(
        p,
        new Date('2026-03-08T14:00Z'),
        new Date('2026-03-08T14:30Z'),
        [],
      ),
    ).toBe(true);
    expect(
      insideBusinessPolicy(
        p,
        new Date('2026-11-01T05:30Z'),
        new Date('2026-11-01T06:00Z'),
        [],
      ),
    ).toBe(false);
  });
});

describe('Professional impact without date horizon', () => {
  it('counts multiday closure loss and superposition without changing personal shifts', () => {
    const before = policyFromOrganization(org(null)),
      after = {
        ...before,
        closures: [
          {
            id: 'new',
            startDate: '2099-01-05',
            endDate: '2099-01-06',
            startMinute: 0,
            endMinute: 1440,
          },
        ],
      };
    expect(professionalRuleEffect(before, after, [])).toEqual({
      basis: 'DATED_RULE_MINUTES',
      gainedMinutes: 0,
      lostMinutes: 1200,
    });
    const partly = {
      ...before,
      closures: [
        {
          id: 'old',
          startDate: '2099-01-05',
          endDate: '2099-01-05',
          startMinute: 540,
          endMinute: 600,
        },
      ],
    };
    expect(
      professionalRuleEffect(
        partly,
        { ...after, closures: [...partly.closures, ...after.closures] },
        [],
      ).lostMinutes,
    ).toBe(1140);
    expect(
      professionalRuleEffect(before, after, [
        { dayOfWeek: 1, startMinute: 600, endMinute: 720 },
      ]).lostMinutes,
    ).toBe(120);
  });
  it('counts a century of full closures by calendar segments without enumerating every date', () => {
    const before = policyFromOrganization(org(null)),
      after = {
        ...before,
        closures: [
          {
            id: 'new',
            startDate: '2100-01-01',
            endDate: '2199-12-31',
            startMinute: 0,
            endMinute: 1440,
          },
        ],
      };
    expect(professionalRuleEffect(before, after, []).lostMinutes).toBe(
      36524 * 600,
    );
  });
});
