'use client';

import { useEffect, useState } from 'react';
import { ApiError, type PublicAvailabilitySlot } from '@/lib/api';
import { useAvailability, useAvailabilityDays } from '@/lib/queries/public-booking';
import { adjacentMonth, calendarMonth, calendarWeek } from '@/lib/public-booking-ui';
import { addBusinessDays } from '@/lib/business-time';
import { usePublicReadWait } from '@/lib/use-public-read-wait';
import { AvailabilityPicker } from '@/components/booking/AvailabilityPicker';
import { NavButtons, StepWrapper } from './shared';

export function DateTimeStep({ slug, visit, serviceId, professionalId, minimumBookingDate, date, selectedStartTime = '', onDateChange,
  onSlotSelect, onClearSlot, onUnavailable, onBack, onNext, professionalName, selectedProfessionalId,
}: {
  slug: string; visit?: string; serviceId: string; professionalId: string; minimumBookingDate: string;
  date: string; time?: string; selectedStartTime?: string; onDateChange: (date: string) => void;
  onSlotSelect: (slot: PublicAvailabilitySlot) => void; onClearSlot?: () => void; onUnavailable?: () => void;
  onBack: () => void; onNext: () => void; professionalName?: string; selectedProfessionalId?: string;
}) {
  const minimumMonth = minimumBookingDate.slice(0, 7);
  const [requestedMonth, setMonth] = useState((date || minimumBookingDate).slice(0, 7));
  const [requestedWeek, setWeek] = useState(date || minimumBookingDate);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const weekStart = requestedWeek < minimumBookingDate ? minimumBookingDate : requestedWeek;
  const month = requestedMonth < minimumMonth ? minimumMonth : requestedMonth;
  const { from, to } = calendarOpen ? calendarMonth(month, minimumBookingDate) : calendarWeek(weekStart, minimumBookingDate);
  const days = useAvailabilityDays(slug, { serviceId, professionalId: professionalId || undefined, from, to }, visit);
  const validDate = date && date >= from && date <= to ? date : '';
  const daily = useAvailability(slug, { serviceId, professionalId: professionalId || undefined, date: validDate }, visit);
  const daysWait = usePublicReadWait(days.error, days.errorUpdatedAt);
  const slotsWait = usePublicReadWait(daily.error, daily.errorUpdatedAt);
  const rangeReady = !days.isFetching && !days.isError && Boolean(days.data);
  const slots = !daily.isError && !daily.isFetching && rangeReady ? daily.data?.slots ?? [] : [];
  const slotValid = Boolean(validDate && days.data?.availableDates.includes(validDate) && slots.some(slot => slot.startTime === selectedStartTime && (!selectedProfessionalId || slot.professionalId === selectedProfessionalId)));
  useEffect(() => {
    if ((days.error instanceof ApiError && days.error.status === 404) || (daily.error instanceof ApiError && daily.error.status === 404)) onUnavailable?.();
  }, [days.error, daily.error, onUnavailable]);
  useEffect(() => {
    if (date && date < minimumBookingDate) onDateChange('');
    else if (selectedStartTime && rangeReady && !daily.isFetching && !daily.isError && daily.data && !slotValid) onClearSlot?.();
  }, [date, minimumBookingDate, selectedStartTime, rangeReady, daily.isFetching, daily.isError, daily.data, slotValid, onDateChange, onClearSlot]);
  useEffect(() => {
    if (validDate && daily.data?.slots.length === 0 && !daily.isFetching && !daily.isError) void days.refetch();
    // Una vez por respuesta vacía, sin sondear el rango.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily.dataUpdatedAt]);
  const readError = (error: unknown) => error instanceof ApiError && error.status === 429
    ? 'Has hecho varias consultas. Espera un momento antes de continuar.'
    : 'No pudimos cargar los horarios. Revisa tu conexión e inténtalo de nuevo.';
  return <StepWrapper title="Elige fecha y hora">
    <AvailabilityPicker month={month} minimumDate={minimumBookingDate} date={validDate} calendarOpen={calendarOpen} weekStart={weekStart}
      onToggleCalendar={() => { if (!calendarOpen) setMonth((date || weekStart).slice(0, 7)); else if (date) setWeek(date); setCalendarOpen(value => !value); }}
      onWeekChange={direction => { const next = addBusinessDays(weekStart, direction * 7); if (next && next <= '9999-12-30') { setWeek(next < minimumBookingDate ? minimumBookingDate : next); onDateChange(''); } }}
      availableDates={rangeReady ? days.data?.availableDates ?? [] : []} slots={slots} selectedStartTime={slotValid ? selectedStartTime : ''}
      daysPending={days.isFetching || days.isLoading} slotsPending={daily.isFetching || daily.isLoading}
      daysError={days.isError ? readError(days.error) : undefined} slotsError={daily.isError ? readError(daily.error) : undefined}
      previousDisabled={calendarOpen ? month <= minimumMonth : weekStart <= minimumBookingDate} nextDisabled={calendarOpen ? !adjacentMonth(month, 1) : !addBusinessDays(weekStart, 7) || addBusinessDays(weekStart, 7)! > '9999-12-30'} waitSeconds={Math.max(daysWait, slotsWait)}
      onMonthChange={direction => { const next = adjacentMonth(month, direction); if (next && next >= minimumMonth) setMonth(next); }}
      onDateChange={day => { onDateChange(day); if (calendarOpen) { setWeek(day); setCalendarOpen(false); } }} onSlotSelect={onSlotSelect} onRetryDays={() => void days.refetch()} onRetrySlots={() => void daily.refetch()} />
    {slotValid && professionalName && <p className="mt-4 text-base">Te atenderá {professionalName}</p>}
    <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!slotValid} nextLabel="Continuar con tus datos" />
  </StepWrapper>;
}
