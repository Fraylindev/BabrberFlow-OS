'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

interface ContextAction {
  label: string;
  danger?: boolean;
  onSelect: () => void;
}

function ContextActionsMenu({
  actions,
  disabled,
}: {
  actions: ContextAction[];
  disabled: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function closeMenu({ restoreFocus = false } = {}) {
    setOpen(false);
    if (restoreFocus) window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  function toggleMenu() {
    if (open) {
      closeMenu();
      return;
    }

    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = 176;
    const estimatedHeight = actions.length * 40 + 8;
    const availableBelow = window.innerHeight - rect.bottom;
    const top =
      availableBelow >= estimatedHeight + 8
        ? rect.bottom + 4
        : Math.max(8, rect.top - estimatedHeight - 4);
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      Math.max(8, window.innerWidth - menuWidth - 8),
    );

    setPosition({ top, left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu({ restoreFocus: true });
      }
    }

    function handleViewportChange() {
      closeMenu();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;

    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (currentIndex + 1) % items.length
            : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Más acciones de la reserva"
        onClick={toggleMenu}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] text-lg font-semibold leading-none text-[var(--dash-text-muted)] outline-none transition-[border-color,background-color,color,box-shadow] hover:border-[var(--dash-accent)] hover:bg-[var(--dash-surface-raised)] hover:text-[var(--dash-text)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true">⋯</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Acciones secundarias"
            onKeyDown={handleMenuKeyDown}
            style={{ top: position.top, left: position.left }}
            className="fixed z-[80] w-44 overflow-hidden rounded-lg border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] p-1 shadow-[var(--dash-shadow-raised)]"
          >
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu({ restoreFocus: true });
                  action.onSelect();
                }}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--dash-accent)] ${
                  action.danger
                    ? 'text-[var(--dash-danger)] hover:bg-[var(--dash-danger-bg)]'
                    : 'text-[var(--dash-text)] hover:bg-[var(--dash-surface-raised)]'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
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

  if (layout === 'mobile') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Button
            key={action.to}
            type="button"
            tone="light"
            variant={action.variant}
            disabled={isUpdating}
            onClick={() => onStatusChange(action.to)}
            className="min-h-10 w-full px-3 py-2 text-xs"
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
            className="min-h-10 w-full px-3 py-2 text-xs"
          >
            Reprogramar
          </Button>
        )}
      </div>
    );
  }

  const primaryAction = actions[0];
  const secondaryActions: ContextAction[] = [
    ...(canReschedule ? [{ label: 'Reprogramar', onSelect: onReschedule }] : []),
    ...actions.slice(1).map((action) => ({
      label: action.label,
      danger: action.to === 'CANCELLED',
      onSelect: () => onStatusChange(action.to),
    })),
  ];

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      {primaryAction && (
        <Button
          type="button"
          tone="light"
          variant="primary"
          disabled={isUpdating}
          onClick={() => onStatusChange(primaryAction.to)}
          className="min-h-9 px-3 py-1.5 text-xs"
        >
          {primaryAction.label}
        </Button>
      )}
      {secondaryActions.length > 0 && (
        <ContextActionsMenu actions={secondaryActions} disabled={isUpdating} />
      )}
    </div>
  );
}
