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

const formatterCache = new Map<string, Intl.DateTimeFormat>();

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
    dayOfWeek: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function addDaysToIsoDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

export function zonedLocalDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date | null {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = desiredUtc;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = getZonedDateParts(new Date(candidate), timeZone);
    const representedAsUtc = Date.UTC(
      Number(parts.date.slice(0, 4)),
      Number(parts.date.slice(5, 7)) - 1,
      Number(parts.date.slice(8, 10)),
      parts.hour,
      parts.minute,
      parts.second,
    );
    candidate += desiredUtc - representedAsUtc;
  }

  const result = new Date(candidate);
  const verified = getZonedDateParts(result, timeZone);
  return verified.date === date &&
    verified.hour === hour &&
    verified.minute === minute
    ? result
    : null;
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
