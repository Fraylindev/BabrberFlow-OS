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
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
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
  const dateParts = parseIsoDate(date);
  const timeMatch = HH_MM_PATTERN.exec(time);
  if (!dateParts || !timeMatch) return null;
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const desiredDate = utcDateFromParts(dateParts);
  desiredDate.setUTCHours(hour, minute, 0, 0);
  const desiredUtc = desiredDate.getTime();
  let candidate = desiredUtc;

  try {
    for (let iteration = 0; iteration < 3; iteration += 1) {
      const parts = getZonedDateParts(new Date(candidate), timeZone);
      const representedParts = parseIsoDate(parts.date);
      if (!representedParts) return null;
      const representedDate = utcDateFromParts(representedParts);
      representedDate.setUTCHours(parts.hour, parts.minute, parts.second, 0);
      candidate += desiredUtc - representedDate.getTime();
    }

    const result = new Date(candidate);
    const verified = getZonedDateParts(result, timeZone);
    return verified.date === date &&
      verified.hour === hour &&
      verified.minute === minute
      ? result
      : null;
  } catch {
    return null;
  }
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
  const start = getZonedDateParts(startTime, timeZone);
  const inclusiveEnd = getZonedDateParts(
    new Date(endTime.getTime() - 1),
    timeZone,
  );
  if (start.date !== inclusiveEnd.date) return false;

  const startMinute = start.hour * 60 + start.minute + start.second / 60;
  const endParts = getZonedDateParts(endTime, timeZone);
  const endMinute =
    endParts.date === start.date
      ? endParts.hour * 60 + endParts.minute + endParts.second / 60
      : 1440;
  if (
    startMinute < globalOpenMinute ||
    endMinute > globalCloseMinute ||
    endMinute <= startMinute
  ) {
    return false;
  }

  if (customSchedule.length === 0) return true;
  return customSchedule.some(
    (window) =>
      window.dayOfWeek === start.dayOfWeek &&
      startMinute >= window.startMinute &&
      endMinute <= window.endMinute,
  );
}
