export interface AvailabilityWindow {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

export interface ZonedDateParts {
  date: string;
  dayOfWeek: number;
  hour: number;
  minute: number;
  second: number;
}

export const ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN =
  /(?:Z|[+-](?:0\d|1\d|2[0-3]):[0-5]\d)$/;

export function hasExplicitTimeZone(value: string): boolean {
  return ISO_TIMESTAMP_WITH_TIME_ZONE_PATTERN.test(value);
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface IsoDateParts {
  year: number;
  month: number;
  day: number;
}

function utcDateFromParts({ year, month, day }: IsoDateParts): Date {
  const value = new Date(0);
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCFullYear(year, month - 1, day);
  return value;
}

function parseIsoDate(value: string): IsoDateParts | null {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  if (parts.year < 1 || parts.month < 1 || parts.month > 12 || parts.day < 1) {
    return null;
  }
  const normalized = utcDateFromParts(parts);
  return normalized.getUTCFullYear() === parts.year &&
    normalized.getUTCMonth() === parts.month - 1 &&
    normalized.getUTCDate() === parts.day
    ? parts
    : null;
}

export function isValidIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    era: 'short',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function parseHHmm(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minuteToHHmm(value: number): string {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (value % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getZonedDateParts(
  value: Date,
  timeZone: string,
): ZonedDateParts {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(value)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  const year = parts.era === 'BC' ? 1 - Number(parts.year) : Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  return {
    date: `${String(year).padStart(4, '0')}-${parts.month}-${parts.day}`,
    dayOfWeek: utcDateFromParts({ year, month, day }).getUTCDay(),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function addDaysToIsoDate(date: string, days: number): string | null {
  const parts = parseIsoDate(date);
  if (!parts || !Number.isSafeInteger(days)) return null;
  const result = utcDateFromParts(parts);
  result.setUTCDate(result.getUTCDate() + days);
  if (!Number.isFinite(result.getTime())) return null;
  const year = result.getUTCFullYear();
  if (year < 1 || year > 9999) return null;
  return `${String(year).padStart(4, '0')}-${String(result.getUTCMonth() + 1).padStart(2, '0')}-${String(result.getUTCDate()).padStart(2, '0')}`;
}

export function zonedLocalDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date | null {
  const occurrences = localDateTimeOccurrences(date, time, timeZone);
  return occurrences.length === 1 ? occurrences[0] : null;
}

const offsetCache = new Map<string, number[]>();

function wallClockStamp(value: Date, timeZone: string): Date {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(value)
      .map((p) => [p.type, p.value]),
  );
  const result = utcDateFromParts({
    year: parts.era === 'BC' ? 1 - Number(parts.year) : Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  });
  result.setUTCHours(
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
    0,
  );
  return result;
}

/** Enumerate and round-trip every nearby UTC offset, including half-hour changes. */
export function localDateTimeOccurrences(
  date: string,
  time: string,
  timeZone: string,
): Date[] {
  const dateParts = parseIsoDate(date);
  const timeMatch = HH_MM_PATTERN.exec(time);
  if (!dateParts || !timeMatch) return [];
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const desiredDate = utcDateFromParts(dateParts);
  desiredDate.setUTCHours(hour, minute, 0, 0);
  const desiredUtc = desiredDate.getTime();
  try {
    const key = `${timeZone}/${date}`;
    let offsets = offsetCache.get(key);
    if (!offsets) {
      const found = new Set<number>();
      const anchor = utcDateFromParts(dateParts).getTime();
      for (let hour = -48; hour <= 48; hour += 6) {
        const instant = anchor + hour * 3600000;
        const represented = wallClockStamp(new Date(instant), timeZone);
        found.add(represented.getTime() - instant);
      }
      offsets = [...found];
      if (offsetCache.size >= 4096) offsetCache.clear();
      offsetCache.set(key, offsets);
    }
    return offsets
      .map((offset) => new Date(desiredUtc - offset))
      .filter((instant) => {
        const parts = getZonedDateParts(instant, timeZone);
        return (
          parts.date === date &&
          parts.hour === hour &&
          parts.minute === minute &&
          parts.second === 0
        );
      })
      .sort((a, b) => a.getTime() - b.getTime());
  } catch {
    return [];
  }
}

/** First actual instant on a date, including displaced or repeated midnight. */
function localDateBoundary(anchor: number, timeZone: string): Date | null {
  let low = (anchor - 48 * 3600000) / 1000;
  let high = (anchor + 48 * 3600000) / 1000;
  try {
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const represented = wallClockStamp(new Date(mid * 1000), timeZone);
      represented.setUTCHours(0, 0, 0, 0);
      if (represented.getTime() < anchor) low = mid + 1;
      else high = mid;
    }
    return new Date(low * 1000);
  } catch {
    return null;
  }
}

export function utcRangeForLocalDate(
  date: string,
  timeZone: string,
): { start: Date; end: Date } | null {
  const parts = parseIsoDate(date);
  if (!parts) return null;
  const anchor = utcDateFromParts(parts).getTime();
  const start = localDateBoundary(anchor, timeZone);
  const end = localDateBoundary(anchor + 86400000, timeZone);
  if (
    !start ||
    !end ||
    end <= start ||
    getZonedDateParts(start, timeZone).date !== date
  )
    return null;
  return { start, end };
}

/** Frozen pre-C1 converter, used only during faithful D4-A legacy transition. */
export function legacyZonedLocalDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date | null {
  const parts = parseIsoDate(date),
    match = HH_MM_PATTERN.exec(time);
  if (!parts || !match) return null;
  const desired = utcDateFromParts(parts);
  desired.setUTCHours(Number(match[1]), Number(match[2]), 0, 0);
  let candidate = desired.getTime();
  try {
    for (let i = 0; i < 3; i++)
      candidate +=
        desired.getTime() -
        wallClockStamp(new Date(candidate), timeZone).getTime();
    const result = new Date(candidate),
      verified = getZonedDateParts(result, timeZone);
    return verified.date === date &&
      verified.hour === Number(match[1]) &&
      verified.minute === Number(match[2])
      ? result
      : null;
  } catch {
    return null;
  }
}

export function legacyIsIntervalInsideWindows(
  startTime: Date,
  endTime: Date,
  timeZone: string,
  open: number,
  close: number,
  custom: AvailabilityWindow[],
): boolean {
  if (endTime <= startTime) return false;
  const start = getZonedDateParts(startTime, timeZone),
    inclusiveEnd = getZonedDateParts(new Date(endTime.getTime() - 1), timeZone);
  if (start.date !== inclusiveEnd.date) return false;
  const startMinute = start.hour * 60 + start.minute + start.second / 60;
  const end = getZonedDateParts(endTime, timeZone),
    endMinute =
      end.date === start.date
        ? end.hour * 60 + end.minute + end.second / 60
        : 1440;
  if (startMinute < open || endMinute > close || endMinute <= startMinute)
    return false;
  return (
    !custom.length ||
    custom.some(
      (w) =>
        w.dayOfWeek === start.dayOfWeek &&
        startMinute >= w.startMinute &&
        endMinute <= w.endMinute,
    )
  );
}

export function localWindowToUtc(
  date: string,
  startMinute: number,
  endMinute: number,
  timeZone: string,
): { start: Date; end: Date } | null {
  const start = zonedLocalDateTimeToUtc(
    date,
    minuteToHHmm(startMinute),
    timeZone,
  );
  const end =
    endMinute === 1440
      ? utcRangeForLocalDate(date, timeZone)?.end
      : zonedLocalDateTimeToUtc(date, minuteToHHmm(endMinute), timeZone);
  return start && end && end > start ? { start, end } : null;
}

export function isUnambiguousInstant(instant: Date, timeZone: string): boolean {
  if (!Number.isFinite(instant.getTime())) return false;
  const parts = getZonedDateParts(instant, timeZone);
  return (
    localDateTimeOccurrences(
      parts.date,
      minuteToHHmm(parts.hour * 60 + parts.minute),
      timeZone,
    ).length === 1
  );
}

export function isIntervalInsideWindows(
  startTime: Date,
  endTime: Date,
  timeZone: string,
  globalOpenMinute: number,
  globalCloseMinute: number,
  customSchedule: AvailabilityWindow[],
): boolean {
  if (endTime <= startTime) return false;
  if (!isUnambiguousInstant(startTime, timeZone)) return false;
  const start = getZonedDateParts(startTime, timeZone);
  const inclusiveEnd = getZonedDateParts(
    new Date(endTime.getTime() - 1),
    timeZone,
  );
  if (start.date !== inclusiveEnd.date) return false;

  const global = localWindowToUtc(
    start.date,
    globalOpenMinute,
    globalCloseMinute,
    timeZone,
  );
  if (!global || startTime < global.start || endTime > global.end) return false;

  if (customSchedule.length === 0) return true;
  return customSchedule.some(
    (window) =>
      window.dayOfWeek === start.dayOfWeek &&
      (() => {
        const interval = localWindowToUtc(
          start.date,
          window.startMinute,
          window.endMinute,
          timeZone,
        );
        return (
          !!interval && startTime >= interval.start && endTime <= interval.end
        );
      })(),
  );
}
