'use client';

import { formatBusinessTime } from '@/lib/calendar';
import { Button } from '@/components/ui/Button';

export function monthEnd(date: string): string {
  const [year, month] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
function adjacentMonth(date: string, offset: number): string {
  const [year, month] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
}
export function CalendarMonth({
  firstDay,
  today,
  availableDates,
  selectedDate,
  disabled,
  pending,
  onMonth,
  onDate,
}: {
  firstDay: string;
  today: string;
  availableDates: string[];
  selectedDate: string;
  disabled: boolean;
  pending: boolean;
  onMonth: (date: string) => void;
  onDate: (date: string) => void;
}) {
  const first = firstDay.slice(0, 7) + '-01';
  const previous = adjacentMonth(first, -1);
  const next = adjacentMonth(first, 1);
  const offset = new Date(first + 'T00:00:00Z').getUTCDay();
  const length = Number(monthEnd(first).slice(-2));
  const available = new Set(availableDates);
  return (
    <div
      className="space-y-3 rounded-xl border border-[var(--dash-border)] p-3"
      aria-label="Calendario de reprogramación"
      aria-busy={pending}
    >
      <div className="flex items-center justify-between gap-1">
        <Button
          tone="light"
          variant="secondary"
          className="min-h-11 shrink-0 px-2!"
          aria-label="Mes anterior"
          disabled={disabled || previous.slice(0, 7) < today.slice(0, 7)}
          onClick={() => onMonth(previous)}
        >
          ‹
        </Button>
        <label className="min-w-0 flex-1 text-center font-semibold">
          <input
            aria-label="Elegir mes"
            type="month"
            value={first.slice(0, 7)}
            min={today.slice(0, 7)}
            className="block min-h-11 w-full min-w-0 rounded border border-[var(--dash-border)] bg-[var(--dash-surface)] p-1 text-base"
            disabled={disabled}
            onChange={(event) => {
              if (
                /^\d{4}-\d{2}$/.test(event.target.value) &&
                event.target.value >= today.slice(0, 7)
              )
                onMonth(event.target.value + '-01');
            }}
          />
        </label>
        <Button
          tone="light"
          variant="secondary"
          className="min-h-11 shrink-0 px-2!"
          aria-label="Mes siguiente"
          disabled={disabled || first.startsWith('9999-12')}
          onClick={() => onMonth(next)}
        >
          ›
        </Button>
      </div>
      <div
        className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--dash-text-muted)]"
        aria-hidden="true"
      >
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" aria-label="Días disponibles">
        {Array.from({ length: offset }, (_, i) => (
          <span aria-hidden="true" key={'empty-' + i} />
        ))}
        {Array.from({ length }, (_, i) => {
          const date = first.slice(0, 8) + String(i + 1).padStart(2, '0');
          const enabled = date >= today && available.has(date) && !pending;
          const label = formatBusinessTime(date, undefined, {
            kind: 'date',
            relative: false,
          }).fullText;
          return (
            <button
              key={date}
              type="button"
              aria-label={enabled ? label : label + ', sin horarios disponibles'}
              aria-pressed={date === selectedDate}
              aria-current={date === today ? 'date' : undefined}
              disabled={disabled || !enabled}
              onClick={() => onDate(date)}
              className="min-h-11 min-w-0 rounded-full border border-[var(--dash-border)] text-sm aria-pressed:border-[var(--dash-accent)] aria-pressed:bg-[var(--dash-accent-soft)] aria-pressed:font-bold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[var(--dash-accent)]"
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[var(--dash-text-muted)]">
        Solo puedes elegir días con horas disponibles.
      </p>
    </div>
  );
}
