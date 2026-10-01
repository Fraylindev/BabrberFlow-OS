'use client';

import { useSyncExternalStore } from 'react';
import { formatBusinessTime } from '@/lib/business-time';

// All visible dates share one minute clock, refreshed on return to the tab.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
function publish() { for (const listener of listeners) listener(); }
function tick() {
  publish();
  timer = setTimeout(tick, 60000 - Date.now() % 60000);
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    timer = setTimeout(tick, 60000 - Date.now() % 60000);
    document.addEventListener('visibilitychange', publish);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', publish);
    }
  };
}
const snapshot = () => Math.floor(Date.now() / 60000) * 60000;
const serverSnapshot = () => null;

export function BusinessTime({ value, zone, kind = 'instant', now, relative = true, className, dateTime }: {
  value: string;
  zone?: string;
  kind?: 'instant' | 'date' | 'wall';
  now?: Date;
  relative?: boolean;
  className?: string;
  dateTime?: string;
}) {
  const minute = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  if (!zone && kind === 'instant') return <span className={className}>Fecha no disponible</span>;
  const date = formatBusinessTime(value, zone, {
    kind, now: now ?? new Date(minute ?? 0), relative: relative && (now !== undefined || minute !== null),
  });
  return <time dateTime={dateTime ?? date.dateTime} title={date.fullText} className={className}>{date.text}</time>;
}
