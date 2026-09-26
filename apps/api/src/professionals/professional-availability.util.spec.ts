import {
  addDaysToIsoDate,
  getZonedDateParts,
  isIntervalInsideWindows,
  isValidIsoDate,
  isValidTimeZone,
  zonedLocalDateTimeToUtc,
} from './professional-availability.util';

describe('professional availability time-zone utilities', () => {
  const timeZone = 'America/Santo_Domingo';

  it('converts organization-local time to the authoritative UTC instant', () => {
    const value = zonedLocalDateTimeToUtc('2099-01-05', '10:30', timeZone);

    expect(value?.toISOString()).toBe('2099-01-05T14:30:00.000Z');
    expect(getZonedDateParts(value as Date, timeZone)).toEqual(
      expect.objectContaining({
        date: '2099-01-05',
        hour: 10,
        minute: 30,
      }),
    );
  });

  it('converts a slot independently of the machine time zone', () => {
    expect(
      zonedLocalDateTimeToUtc(
        '2026-07-15',
        '10:00',
        'America/New_York',
      )?.toISOString(),
    ).toBe('2026-07-15T14:00:00.000Z');
  });

  it.each([
    '2026-02-30',
    '2026-13-01',
    '2026-00-10',
    '0000-01-01',
    '92026-06-14',
    '14/mm/92026',
  ])('rejects malformed local date %s without throwing', (date) => {
    expect(isValidIsoDate(date)).toBe(false);
    expect(() =>
      zonedLocalDateTimeToUtc(date, '10:00', timeZone),
    ).not.toThrow();
    expect(zonedLocalDateTimeToUtc(date, '10:00', timeZone)).toBeNull();
    expect(() => addDaysToIsoDate(date, 1)).not.toThrow();
    expect(addDaysToIsoDate(date, 1)).toBeNull();
  });

  it('rejects malformed time and time zone without throwing', () => {
    expect(zonedLocalDateTimeToUtc('2026-09-13', '25:00', timeZone)).toBeNull();
    expect(
      zonedLocalDateTimeToUtc('2026-09-13', '10:00', 'Not/A_Time_Zone'),
    ).toBeNull();
  });

  it('adds calendar days safely across leap days and supported year limits', () => {
    expect(addDaysToIsoDate('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysToIsoDate('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDaysToIsoDate('9999-12-31', 1)).toBeNull();
    expect(addDaysToIsoDate('2026-09-13', Number.MAX_SAFE_INTEGER)).toBeNull();
  });

  it('rejects invalid IANA zones', () => {
    expect(isValidTimeZone(timeZone)).toBe(true);
    expect(isValidTimeZone('Not/A_Time_Zone')).toBe(false);
  });

  it('requires the whole booking to fit global and individual windows', () => {
    const start = new Date('2099-01-05T14:00:00.000Z');
    const end = new Date('2099-01-05T14:30:00.000Z');
    const dayOfWeek = getZonedDateParts(start, timeZone).dayOfWeek;

    expect(
      isIntervalInsideWindows(start, end, timeZone, 540, 1140, [
        { dayOfWeek, startMinute: 600, endMinute: 720 },
      ]),
    ).toBe(true);
    expect(
      isIntervalInsideWindows(start, end, timeZone, 660, 1140, [
        { dayOfWeek, startMinute: 600, endMinute: 720 },
      ]),
    ).toBe(false);
  });

  it('treats an absent individual schedule as inheritance of global hours', () => {
    expect(
      isIntervalInsideWindows(
        new Date('2099-01-05T14:00:00.000Z'),
        new Date('2099-01-05T14:30:00.000Z'),
        timeZone,
        540,
        1140,
        [],
      ),
    ).toBe(true);
  });
});
