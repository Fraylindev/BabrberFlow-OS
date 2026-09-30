// Wall-clock values are interpreted only in the authoritative business zone.
// Keep this aligned with C1 professional-availability.util (D10); no browser-zone fallback.
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(zone: string) {
  let value = formatters.get(zone);
  if (!value) {
    value = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      era: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    if (formatters.size >= 32) formatters.clear();
    formatters.set(zone, value);
  }
  return value;
}
function parts(date: Date, zone: string) {
  const values = Object.fromEntries(
    formatter(zone)
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const year = values.era === 'BC' ? 1 - Number(values.year) : Number(values.year);
  return {
    year,
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}
function stamp(p: ReturnType<typeof parts>) {
  const date = new Date(0);
  date.setUTCFullYear(p.year, p.month - 1, p.day);
  date.setUTCHours(p.hour, p.minute, p.second, 0);
  return date.getTime();
}
const pad = (n: number) => String(n).padStart(2, '0');
export function validBusinessDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  if (year < 1 || year > 9999) return false;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
export function addBusinessDays(date: string, days: number): string | null {
  if (!validBusinessDate(date)) return null;
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.getUTCFullYear() < 1 || value.getUTCFullYear() > 9999
    ? null
    : value.toISOString().slice(0, 10);
}
export function businessDate(value: Date, zone: string) {
  const p = parts(value, zone);
  return `${String(p.year).padStart(4, '0')}-${pad(p.month)}-${pad(p.day)}`;
}
export function businessLocalInput(value: string, zone: string) {
  const p = parts(new Date(value), zone);
  return `${String(p.year).padStart(4, '0')}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
export function businessLocalToIso(value: string, zone: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match || !validBusinessDate(match[1])) return null;
  const [year, month, day] = match[1].split('-').map(Number);
  const desired = stamp({
    year,
    month,
    day,
    hour: Number(match[2]),
    minute: Number(match[3]),
    second: 0,
  });
  try {
    const offsets = new Set<number>();
    const anchor = new Date(`${match[1]}T00:00:00Z`).getTime();
    for (let hour = -48; hour <= 48; hour += 6) {
      const instant = anchor + hour * 3600000;
      offsets.add(stamp(parts(new Date(instant), zone)) - instant);
    }
    const occurrences = [...offsets]
      .map((offset) => desired - offset)
      .filter((instant) => stamp(parts(new Date(instant), zone)) === desired);
    return occurrences.length === 1 ? new Date(occurrences[0]).toISOString() : null;
  } catch {
    return null;
  }
}
function boundary(date: string, zone: string): number | null {
  if (!validBusinessDate(date)) return null;
  const anchor = new Date(`${date}T00:00:00Z`).getTime();
  let low = (anchor - 48 * 3600000) / 1000;
  let high = (anchor + 48 * 3600000) / 1000;
  try {
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const p = parts(new Date(mid * 1000), zone);
      const represented = stamp({ ...p, hour: 0, minute: 0, second: 0 });
      if (represented < anchor) low = mid + 1;
      else high = mid;
    }
    return low * 1000;
  } catch {
    return null;
  }
}
export function businessDayRange(date: string, zone: string) {
  const next = addBusinessDays(date, 1);
  const start = boundary(date, zone),
    end = next ? boundary(next, zone) : null;
  if (
    start === null ||
    end === null ||
    end <= start ||
    businessDate(new Date(start), zone) !== date
  )
    return null;
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}
export function businessWeek(value: Date, zone: string) {
  const today = businessDate(value, zone);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const from = addBusinessDays(today, weekday === 0 ? -6 : 1 - weekday)!;
  return { from, to: addBusinessDays(from, 6)! };
}
export function formatBusinessInstant(value: string, zone: string, timeOnly = false) {
  return new Intl.DateTimeFormat('es-DO', {
    timeZone: zone,
    ...(timeOnly
      ? { hour: 'numeric' as const, minute: '2-digit' as const }
      : { dateStyle: 'medium' as const, timeStyle: 'short' as const }),
  }).format(new Date(value));
}
export function formatCalendarDate(value: string, dateStyle: 'medium' | 'long' = 'medium') {
  return new Intl.DateTimeFormat('es-DO', { timeZone: 'UTC', dateStyle }).format(
    new Date(`${value}T12:00:00Z`),
  );
}
