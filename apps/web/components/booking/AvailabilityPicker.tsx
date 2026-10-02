'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { calendarMonth, calendarWeek, slotPeriod, type SlotPeriod } from '@/lib/public-booking-ui';
import { formatBusinessClock, formatBusinessTime } from '@/lib/business-time';
import type { PublicAvailabilitySlot } from '@/lib/api';

export function AvailabilityPicker({ month, minimumDate, availableDates, date, slots, selectedStartTime,
  daysPending, slotsPending, daysError, slotsError, onMonthChange, onDateChange, onSlotSelect, onRetryDays, onRetrySlots,
  previousDisabled = false, nextDisabled = false, waitSeconds = 0, calendarOpen, weekStart, onToggleCalendar, onWeekChange,
}: {
  month: string; minimumDate: string; availableDates: string[]; date: string;
  slots: PublicAvailabilitySlot[]; selectedStartTime: string;
  daysPending: boolean; slotsPending: boolean; daysError?: string; slotsError?: string;
  onMonthChange: (direction: number) => void; onDateChange: (date: string) => void;
  onSlotSelect: (slot: PublicAvailabilitySlot) => void; onRetryDays: () => void; onRetrySlots: () => void;
  previousDisabled?: boolean; nextDisabled?: boolean; waitSeconds?: number;
  calendarOpen: boolean; weekStart: string; onToggleCalendar: () => void; onWeekChange: (direction: number) => void;
}) {
  const monthDays = calendarMonth(month, minimumDate);
  const dates = calendarOpen ? monthDays.dates : calendarWeek(weekStart, minimumDate).dates;
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef('');
  const calendarToggle = useRef<HTMLButtonElement>(null);
  const available = dates.filter(day => day >= minimumDate && availableDates.includes(day));
  const canPick = !daysPending && !daysError;
  const monthLabel = new Intl.DateTimeFormat('es-DO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`));
  const weekLabel = dates.length ? new Intl.DateTimeFormat('es-DO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).formatRange(new Date(`${dates[0]}T12:00:00Z`), new Date(`${dates.at(-1)}T12:00:00Z`)) : monthLabel;
  const dateLabel = (day: string) => formatBusinessTime(day, undefined, { kind: 'date', relative: false }).fullText;
  useEffect(() => {
    pendingFocus.current = !calendarOpen ? date : '';
  }, [calendarOpen, date]);
  useEffect(() => {
    if (calendarOpen || daysPending || !pendingFocus.current) return;
    const button = buttons.current.get(pendingFocus.current);
    const frame = requestAnimationFrame(() => {
      if (button && !button.disabled) button.focus({ preventScroll: true });
      else calendarToggle.current?.focus({ preventScroll: true });
      pendingFocus.current = '';
    });
    return () => cancelAnimationFrame(frame);
  }, [calendarOpen, date, daysPending, canPick]);
  const dayButtons = dates.map(day => {
    const enabled = canPick && available.includes(day);
    const weekday = new Intl.DateTimeFormat('es-DO', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`)).replace('.', '');
    return <button key={day} ref={node => { if (node) buttons.current.set(day, node); else buttons.current.delete(day); }}
      type="button" disabled={!enabled} aria-pressed={date === day}
      aria-label={`${dateLabel(day)}${enabled ? '' : daysPending ? ', disponibilidad pendiente' : daysError ? ', disponibilidad sin comprobar' : ', sin horarios disponibles'}`}
      onClick={() => onDateChange(day)}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = available.indexOf(day);
        const target = event.key === 'Home' ? available[0] : event.key === 'End' ? available.at(-1)
          : available[index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1)];
        if (target) buttons.current.get(target)?.focus();
      }}
      className={`${calendarOpen ? 'calendar-day' : 'week-day'} ${date === day && enabled ? 'calendar-day-selected' : ''}`}>
      {!calendarOpen && <span className="text-xs capitalize">{weekday}</span>}
      <span>{Number(day.slice(-2))}</span>{date === day && enabled && <span className="sr-only">Seleccionado</span>}
    </button>;
  });
  return <div className="availability-picker">
    <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
      <h3 className="text-base font-medium">Fecha</h3>
      <button ref={calendarToggle} type="button" onClick={onToggleCalendar} aria-expanded={calendarOpen} aria-controls="booking-calendar" className="booking-text-action">{calendarOpen ? 'Cerrar calendario' : 'Ver calendario'}</button>
    </div>
    <div className="flex items-center justify-between gap-2 pb-2">
      <button type="button" className="min-h-11 min-w-11" aria-label={calendarOpen ? 'Mes anterior' : 'Siete días anteriores'} disabled={previousDisabled || daysPending || waitSeconds > 0} onClick={() => calendarOpen ? onMonthChange(-1) : onWeekChange(-1)}>←</button>
      <p className="text-center text-sm capitalize" aria-live="polite">{calendarOpen ? monthLabel : weekLabel}</p>
      <button type="button" className="min-h-11 min-w-11" aria-label={calendarOpen ? 'Mes siguiente' : 'Siete días siguientes'} disabled={nextDisabled || daysPending || waitSeconds > 0} onClick={() => calendarOpen ? onMonthChange(1) : onWeekChange(1)}>→</button>
    </div>
    {calendarOpen ? <div id="booking-calendar">
      <div className="calendar-grid" aria-label={`Días de ${monthLabel}`} aria-busy={daysPending}>
        {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map(day => <span key={day} className="py-2 text-center text-xs text-[var(--color-muted)]" aria-hidden="true">{day}</span>)}
        {Array.from({ length: monthDays.offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}{dayButtons}
      </div>
      <div className="calendar-list"><label htmlFor="available-day" className="mb-2 block text-sm">Día disponible</label>
        <select id="available-day" className="booking-input" value={date} disabled={!canPick || !available.length} onChange={event => onDateChange(event.target.value)}>
          <option value="">Selecciona un día</option>{available.map(day => <option key={day} value={day}>{dateLabel(day)}</option>)}
        </select>
      </div>
    </div> : <div className="week-days" aria-label="Días próximos" aria-busy={daysPending}>{dayButtons}</div>}
    <div role="status" aria-live="polite" className="mt-3 text-sm text-[var(--color-muted)]">
      {daysPending ? 'Buscando días disponibles…' : !daysError && !available.length ? `No hay horarios disponibles ${calendarOpen ? 'en este mes' : 'en estos días'}. Prueba otras fechas.` : ''}
    </div>
    {waitSeconds > 0 && <p role="status">Puedes volver a consultar en {waitSeconds} segundos.</p>}
    {daysError && <div role="alert" className="mt-3"><p>{daysError}</p><Button variant="secondary" onClick={onRetryDays} disabled={daysPending || waitSeconds > 0}>Reintentar días</Button></div>}
    <HourOptions key={date} date={date} slots={slots} selectedStartTime={selectedStartTime} pending={Boolean(date && slotsPending)}
      canPick={canPick && !daysPending} error={slotsError} waitSeconds={waitSeconds} onSlotSelect={onSlotSelect} onRetry={onRetrySlots} />
  </div>;
}

function HourOptions({ date, slots, selectedStartTime, pending, canPick, error, waitSeconds, onSlotSelect, onRetry }: {
  date: string; slots: PublicAvailabilitySlot[]; selectedStartTime: string; pending: boolean; canPick: boolean;
  error?: string; waitSeconds: number; onSlotSelect: (slot: PublicAvailabilitySlot) => void; onRetry: () => void;
}) {
  const [period, setPeriod] = useState<SlotPeriod>('all');
  const labels: Record<SlotPeriod, string> = { all: 'Todos', morning: 'Mañana', afternoon: 'Tarde', night: 'Noche' };
  const showFilters = slots.length > 12;
  const effectivePeriod = showFilters && slots.some(slot => slotPeriod(slot.time) === period) ? period : 'all';
  const visible = effectivePeriod === 'all' ? slots : slots.filter(slot => slotPeriod(slot.time) === effectivePeriod);
  return <section className="mt-5" aria-labelledby="available-hour-title" aria-busy={pending}>
    <h3 id="available-hour-title" className="mb-3 text-base font-medium">Hora</h3>
    {showFilters && canPick && !pending && !error && <div className="hour-filters" role="group" aria-label="Momento del día">
      {(Object.keys(labels) as SlotPeriod[]).filter(item => item === 'all' || slots.some(slot => slotPeriod(slot.time) === item)).map(item =>
        <button key={item} type="button" aria-pressed={effectivePeriod === item} onClick={() => setPeriod(item)} className={effectivePeriod === item ? 'hour-filter-selected' : ''}>{labels[item]}</button>)}
    </div>}
    <div role="group" aria-label="Horas disponibles" className="hour-options">
      {!pending && !error && canPick && visible.map(slot => <button key={`${slot.startTime}-${slot.professionalId}`} type="button"
        aria-pressed={selectedStartTime === slot.startTime} onClick={() => onSlotSelect(slot)} className={selectedStartTime === slot.startTime ? 'hour-selected' : ''}>{formatBusinessClock(slot.time)}</button>)}
    </div>
    <p role="status" className="text-sm text-[var(--color-muted)]">{!date ? 'Elige un día para ver las horas.' : pending ? 'Buscando horarios disponibles…' : !error && canPick && !slots.length ? 'Ya no quedan horas para este día. Elige otro día.' : ''}</p>
    {error && <div role="alert" className="mt-3"><p>{error}</p><Button variant="secondary" onClick={onRetry} disabled={pending || waitSeconds > 0}>Reintentar horas</Button></div>}
  </section>;
}
