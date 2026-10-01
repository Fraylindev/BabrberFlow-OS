'use client';

import { useRef } from 'react';
import { BusinessTime } from '@/components/ui/BusinessTime';
import { Button } from '@/components/ui/Button';
import { calendarMonth } from '@/lib/public-booking-ui';
import { formatBusinessClock, formatBusinessTime } from '@/lib/business-time';
import type { PublicAvailabilitySlot } from '@/lib/api';

// Presentación reutilizable: el consumidor entrega días/slots del contrato de su contexto.
export function AvailabilityPicker({ month, minimumDate, availableDates, date, slots, selectedStartTime,
  daysPending, slotsPending, daysError, slotsError, onMonthChange, onDateChange, onSlotSelect, onRetryDays, onRetrySlots,
  previousDisabled = false, nextDisabled = false, waitSeconds = 0,
}: {
  month: string; minimumDate: string; availableDates: string[]; date: string;
  slots: PublicAvailabilitySlot[]; selectedStartTime: string;
  daysPending: boolean; slotsPending: boolean; daysError?: string; slotsError?: string;
  onMonthChange: (direction: number) => void; onDateChange: (date: string) => void;
  onSlotSelect: (slot: PublicAvailabilitySlot) => void; onRetryDays: () => void; onRetrySlots: () => void;
  previousDisabled?: boolean; nextDisabled?: boolean; waitSeconds?: number;
}) {
  const { dates, offset } = calendarMonth(month, minimumDate);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const available = dates.filter(day => day >= minimumDate && availableDates.includes(day));
  const canPick = !daysPending && !daysError;
  const monthLabel = new Intl.DateTimeFormat('es-DO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`));
  const dateLabel = (day: string) => formatBusinessTime(day, undefined, { kind: 'date', relative: false }).fullText;

  return <div className="availability-picker border border-[var(--color-border-strong)] bg-[var(--color-surface)]">
    <div className="flex items-center justify-between gap-2 px-2 py-3">
      <button type="button" className="min-h-11 min-w-11" aria-label="Mes anterior" disabled={previousDisabled || daysPending || waitSeconds > 0} onClick={() => onMonthChange(-1)}>←</button>
      <h3 className="text-center text-base font-semibold capitalize" aria-live="polite">{monthLabel}</h3>
      <button type="button" className="min-h-11 min-w-11" aria-label="Mes siguiente" disabled={nextDisabled || daysPending || waitSeconds > 0} onClick={() => onMonthChange(1)}>→</button>
    </div>
    <div className="calendar-grid" aria-label={`Días de ${monthLabel}`} aria-busy={daysPending}>
      {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map(day => <span key={day} className="py-2 text-center text-xs text-[var(--color-muted)]" aria-hidden="true">{day}</span>)}
      {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
      {dates.map(day => {
        const enabled = canPick && available.includes(day);
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
          className={`calendar-day ${date === day && enabled ? 'calendar-day-selected' : ''}`}>
          <span>{Number(day.slice(-2))}</span>{date === day && enabled && <span className="sr-only">Seleccionado</span>}
        </button>;
      })}
    </div>
    <div className="calendar-list px-3">
      <label htmlFor="available-day" className="mb-2 block text-sm">Día disponible</label>
      <select id="available-day" className="booking-input" value={date} disabled={!canPick || !available.length} onChange={event => onDateChange(event.target.value)}>
        <option value="">Selecciona un día</option>{available.map(day => <option key={day} value={day}>{dateLabel(day)}</option>)}
      </select>
    </div>
    <div className="space-y-3 px-3 pb-4 pt-3">
      <p className="text-sm text-[var(--color-muted)]">{daysPending ? 'Estamos consultando los días disponibles.' : daysError ? 'Los días se habilitan cuando podemos comprobar sus horarios.' : 'Los días deshabilitados no tienen horarios disponibles.'}</p>
      <div role="status" aria-live="polite" className="text-sm text-[var(--color-muted)]">
        {daysPending ? 'Buscando días disponibles…' : !daysError && !available.length ? 'No hay horarios disponibles en este mes para tu selección.' : ''}
      </div>
      {waitSeconds > 0 && <p role="status">Puedes volver a consultar en {waitSeconds} segundos.</p>}
      {daysError && <div role="alert"><p>{daysError}</p><Button variant="secondary" onClick={onRetryDays} disabled={daysPending || waitSeconds > 0}>Reintentar días</Button></div>}
      <div className="border-t border-[var(--color-border)] pt-3">
        <label htmlFor="available-hour" className="mb-2 block text-sm font-medium">Hora</label>
        <select id="available-hour" name="hour" className="booking-input" value={selectedStartTime}
          disabled={!date || !canPick || slotsPending || Boolean(slotsError) || !slots.length}
          onChange={event => { const slot = slots.find(item => item.startTime === event.target.value); if (slot) onSlotSelect(slot); }}>
          <option value="">Selecciona una hora</option>
          {slots.map(slot => <option key={`${slot.startTime}-${slot.professionalId}`} value={slot.startTime}>{formatBusinessClock(slot.time)}</option>)}
        </select>
        <p role="status" className="mt-2 text-sm text-[var(--color-muted)]">
          {!date ? 'Elige un día para ver las horas.' : slotsPending ? 'Buscando horarios disponibles…'
            : !slotsError && !slots.length ? 'Ya no quedan horas para este día. Elige otro día.' : <><BusinessTime kind="date" value={date} relative={false} /> · {slots.length} horarios disponibles</>}
        </p>
        {slotsError && <div role="alert" className="mt-3"><p>{slotsError}</p><Button variant="secondary" onClick={onRetrySlots} disabled={slotsPending || waitSeconds > 0}>Reintentar horas</Button></div>}
      </div>
    </div>
  </div>;
}
