'use client';
import { formatBusinessTime } from '@/lib/calendar';
export function CalendarTime({
  value,
  zone,
  clock = false,
}: {
  value: string;
  zone: string;
  clock?: boolean;
}) {
  const formatted = formatBusinessTime(value, zone, { relative: false });
  return (
    <time dateTime={formatted.dateTime} title={formatted.fullText}>
      {clock ? formatted.clock : formatted.text}
    </time>
  );
}
