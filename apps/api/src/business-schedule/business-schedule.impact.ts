import {
  addDaysToIsoDate,
  type AvailabilityWindow,
} from '../professionals/professional-availability.util';
import { type BusinessPolicy } from './business-schedule.policy';

function minutes(
  policy: BusinessPolicy,
  individual: AvailabilityWindow[],
  day: number,
  date?: string,
): Set<number> {
  const result = new Set<number>();
  const closures = date
    ? policy.closures.filter((c) => c.startDate <= date && c.endDate >= date)
    : [];
  for (const w of policy.windows.filter((w) => w.dayOfWeek === day))
    for (let m = w.startMinute; m < w.endMinute; m++) {
      if (
        individual.length &&
        !individual.some(
          (i) => i.dayOfWeek === day && m >= i.startMinute && m < i.endMinute,
        )
      )
        continue;
      if (closures.some((c) => m >= c.startMinute && m < c.endMinute)) continue;
      result.add(m);
    }
  return result;
}

/** Clock-rule minutes, not a forecast of free appointments or real DST durations. */
export function professionalRuleEffect(
  before: BusinessPolicy,
  after: BusinessPolicy,
  individual: AvailabilityWindow[],
) {
  const changed = [
    ...before.closures.filter(
      (c) => !after.closures.some((a) => a.id === c.id),
    ),
    ...after.closures.filter(
      (c) => !before.closures.some((b) => b.id === c.id),
    ),
  ];
  let gainedMinutes = 0,
    lostMinutes = 0;
  const compare = (day: number, date?: string, count = 1) => {
    const a = minutes(before, individual, day, date),
      b = minutes(after, individual, day, date);
    gainedMinutes += [...b].filter((m) => !a.has(m)).length * count;
    lostMinutes += [...a].filter((m) => !b.has(m)).length * count;
  };
  if (!changed.length) {
    for (let day = 0; day < 7; day++) compare(day);
    return { basis: 'RECURRING_WEEK', gainedMinutes, lostMinutes };
  }
  const start = changed.reduce(
      (a, c) => (c.startDate < a ? c.startDate : a),
      changed[0].startDate,
    ),
    end = changed.reduce(
      (a, c) => (c.endDate > a ? c.endDate : a),
      changed[0].endDate,
    );
  const endExclusive = addDaysToIsoDate(end, 1);
  if (!endExclusive) throw new Error('Unsupported closure date boundary');
  const cuts = new Set<string>([start, endExclusive]);
  for (const c of [...before.closures, ...after.closures]) {
    if (c.startDate > start && c.startDate < endExclusive)
      cuts.add(c.startDate);
    const next = addDaysToIsoDate(c.endDate, 1);
    if (next && next > start && next < endExclusive) cuts.add(next);
  }
  const ordered = [...cuts].sort();
  for (let i = 0; i < ordered.length - 1; i++) {
    const first = new Date(`${ordered[i]}T00:00:00.000Z`),
      last = new Date(`${ordered[i + 1]}T00:00:00.000Z`);
    const days = (last.getTime() - first.getTime()) / 86400000;
    for (let day = 0; day < 7; day++) {
      const distance = (day - first.getUTCDay() + 7) % 7;
      const count = Math.floor(days / 7) + (distance < days % 7 ? 1 : 0);
      if (count) compare(day, ordered[i], count);
    }
  }
  return { basis: 'DATED_RULE_MINUTES', gainedMinutes, lostMinutes };
}
