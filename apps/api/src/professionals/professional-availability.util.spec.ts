import {
  getZonedDateParts,
  isIntervalInsideWindows,
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
