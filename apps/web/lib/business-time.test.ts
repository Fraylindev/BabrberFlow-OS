import assert from 'node:assert/strict';
import test from 'node:test';
import {
  businessLocalToIso,
  businessLocalInput,
  businessDayRange,
  businessWeek,
  validBusinessDate,
} from './business-time.ts';
import { weekError, closureError } from './business-schedule.ts';

test('business time does not inherit the browser zone; creation and rescheduling round-trip', () => {
  assert.equal(
    businessLocalToIso('2030-01-05T10:17', 'America/Santo_Domingo'),
    '2030-01-05T14:17:00.000Z',
  );
  assert.equal(
    businessLocalInput('2030-01-05T14:17:00.000Z', 'America/Santo_Domingo'),
    '2030-01-05T10:17',
  );
  assert.equal(
    businessWeek(new Date('2026-09-28T01:00:00Z'), 'America/Santo_Domingo').from,
    '2026-09-21',
  );
});
test('nonexistent and repeated hours, including half-hour transitions, fail closed', () => {
  assert.equal(businessLocalToIso('2026-03-08T02:30', 'America/New_York'), null);
  assert.equal(businessLocalToIso('2026-11-01T01:30', 'America/New_York'), null);
  assert.equal(businessLocalToIso('2026-04-05T01:45', 'Australia/Lord_Howe'), null);
  assert.equal(businessLocalToIso('2026-10-04T02:15', 'Australia/Lord_Howe'), null);
  assert.equal(businessLocalToIso('2011-12-30T12:00', 'Pacific/Apia'), null);
});
test('calendar ranges preserve real 23/25 and 23.5/24.5 hour days', () => {
  for (const [date, zone, hours] of [
    ['2026-03-08', 'America/New_York', 23],
    ['2026-11-01', 'America/New_York', 25],
    ['2026-04-05', 'Australia/Lord_Howe', 24.5],
    ['2026-10-04', 'Australia/Lord_Howe', 23.5],
  ] as const) {
    const range = businessDayRange(date, zone)!;
    assert.equal((Date.parse(range.end) - Date.parse(range.start)) / 3600000, hours);
  }
  assert.equal(businessDayRange('2011-12-30', 'Pacific/Apia'), null);
  assert.equal(
    businessDayRange('2018-11-04', 'America/Sao_Paulo')?.start,
    '2018-11-04T03:00:00.000Z',
  );
});
test('strict dates, years below 100 and supported boundaries have no rollover', () => {
  assert.equal(validBusinessDate('2026-02-30'), false);
  assert.equal(validBusinessDate('0000-01-01'), false);
  assert.equal(validBusinessDate('0001-01-01'), true);
  assert.equal(businessLocalToIso('2026-02-30T10:00', 'America/Santo_Domingo'), null);
  assert.equal(businessLocalToIso('2026-01-01T24:00', 'America/Santo_Domingo'), null);
  assert.equal(businessDayRange('9999-12-31', 'America/Santo_Domingo'), null);
  assert.equal(businessLocalToIso('2030-01-05T10:00', 'invalid-zone'), null);
});
test('seven explicit days accept closure and contiguous windows, reject overlaps and duplicates', () => {
  const week = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    windows: [] as { startTime: string; endTime: string }[],
  }));
  assert.equal(weekError(week), null);
  week[1].windows = [
    { startTime: '09:00', endTime: '12:00' },
    { startTime: '12:00', endTime: '24:00' },
  ];
  assert.equal(weekError(week), null);
  week[1].windows[1].startTime = '11:59';
  assert.ok(weekError(week));
  assert.ok(weekError([...week.slice(0, 6), week[0]]));
});
test('closures distinguish full inclusive ranges from single-day partial closures', () => {
  assert.equal(
    closureError({
      startDate: '2030-01-01',
      endDate: '2030-01-05',
      startTime: '00:00',
      endTime: '24:00',
    }),
    null,
  );
  assert.ok(
    closureError({
      startDate: '2030-01-01',
      endDate: '2030-01-05',
      startTime: '09:00',
      endTime: '10:00',
    }),
  );
  assert.ok(
    closureError({
      startDate: '9999-12-31',
      endDate: '9999-12-31',
      startTime: '00:00',
      endTime: '24:00',
    }),
  );
});
