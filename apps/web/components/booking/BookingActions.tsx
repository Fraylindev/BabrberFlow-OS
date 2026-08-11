'use client';

import type { Booking, BookingStatus } from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface StatusAction {
  label: string;
  to: BookingStatus;
  variant: 'primary' | 'danger';
}

const STAFF_ACTIONS: Partial<Record<BookingStatus, StatusAction[]>> = {
  PENDING: [
    { label: 'Confirmar', to: 'CONFIRMED', variant: 'primary' },
    { label: 'Cancelar', to: 'CANCELLED', variant: 'danger' },
  ],
  CONFIRMED: [
    { label: 'Completar', to: 'COMPLETED', variant: 'primary' },
    { label: 'No asistió', to: 'NO_SHOW', variant: 'danger' },
    { label: 'Cancelar', to: 'CANCELLED', variant: 'danger' },
  ],
};

const BARBER_ACTIONS: Partial<Record<BookingStatus, StatusAction[]>> = {
  PENDING: [{ label: 'Confirmar', to: 'CONFIRMED', variant: 'primary' }],
  CONFIRMED: [
    { label: 'Completar', to: 'COMPLETED', variant: 'primary' },
    { label: 'No asistió', to: 'NO_SHOW', variant: 'danger' },
  ],
};

interface BookingActionsProps {
  booking: Booking;
  isBarber: boolean;
  isUpdating: boolean;
  layout: 'mobile' | 'table';
  onStatusChange: (status: BookingStatus) => void;
  onReschedule: () => void;
}

export function BookingActions({
  booking,
  isBarber,
  isUpdating,
  layout,
  onStatusChange,
  onReschedule,
}: BookingActionsProps) {
  const actions = (isBarber ? BARBER_ACTIONS : STAFF_ACTIONS)[booking.status] ?? [];
  const canReschedule =
    !isBarber && (booking.status === 'PENDING' || booking.status === 'CONFIRMED');

  if (actions.length === 0 && !canReschedule) {
    return <span className="text-xs text-[var(--dash-text-faint)]">Sin acciones disponibles</span>;
  }

  return (
    <div
      className={
        layout === 'mobile' ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap items-center gap-1.5'
      }
    >
      {actions.map((action) => (
        <Button
          key={action.to}
          type="button"
          tone="light"
          variant={action.variant}
          disabled={isUpdating}
          onClick={() => onStatusChange(action.to)}
          className={
            layout === 'mobile' ? 'min-h-10 w-full px-3 py-2 text-xs' : 'px-2.5 py-1 text-xs'
          }
        >
          {action.label}
        </Button>
      ))}
      {canReschedule && (
        <Button
          type="button"
          tone="light"
          variant="secondary"
          disabled={isUpdating}
          onClick={onReschedule}
          className={
            layout === 'mobile' ? 'min-h-10 w-full px-3 py-2 text-xs' : 'px-2.5 py-1 text-xs'
          }
        >
          Reprogramar
        </Button>
      )}
    </div>
  );
}
