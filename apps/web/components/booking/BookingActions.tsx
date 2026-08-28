'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  isIssuing: boolean;
  layout: 'mobile' | 'table';
  onStatusChange: (status: BookingStatus) => void;
  onReschedule: () => void;
  onIssueInvoice: () => void;
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
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  function closeMenu({ restoreFocus = false } = {}) {
    setOpen(false);
    setPosition(null);
    if (restoreFocus) window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  function toggleMenu() {
    if (open) {
      closeMenu();
      return;
    }

    if (!triggerRef.current) return;

    setPosition(null);
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const viewportMargin = 8;
    const triggerGap = 4;
    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const belowTop = triggerRect.bottom + triggerGap;
    const aboveTop = triggerRect.top - menuRect.height - triggerGap;
    const fitsBelow = belowTop + menuRect.height <= viewportHeight - viewportMargin;
    const fitsAbove = aboveTop >= viewportMargin;

    let top: number;
    if (fitsBelow) {
      top = belowTop;
    } else if (fitsAbove) {
      top = aboveTop;
    } else {
      const maximumTop = Math.max(
        viewportMargin,
        viewportHeight - menuRect.height - viewportMargin,
      );
      top = Math.min(Math.max(viewportMargin, belowTop), maximumTop);
    }

    const maximumLeft = Math.max(viewportMargin, viewportWidth - menuRect.width - viewportMargin);
    const left = Math.min(
      Math.max(viewportMargin, triggerRect.right - menuRect.width),
      maximumLeft,
    );

    setPosition({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open || !position) return;

    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [open, position]);

  useEffect(() => {
    if (!open) return;

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
      closeMenu({ restoreFocus: menuRef.current?.contains(document.activeElement) ?? false });
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

  const portalTarget =
    typeof document === 'undefined'
      ? null
      : (document.querySelector<HTMLElement>('.dashboard-shell') ?? document.body);

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
        portalTarget &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Acciones secundarias"
            onKeyDown={handleMenuKeyDown}
            style={{
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              visibility: position ? 'visible' : 'hidden',
              backgroundColor: 'var(--dash-surface, #ffffff)',
              borderColor: 'var(--dash-border-strong, #d4d4d8)',
              boxShadow:
                'var(--dash-shadow-raised, 0 4px 6px rgba(24, 24, 27, 0.05), 0 10px 24px -8px rgba(24, 24, 27, 0.12))',
            }}
            className="fixed z-[120] max-h-[calc(100dvh-1rem)] w-44 overflow-y-auto rounded-lg border p-1"
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
          portalTarget,
        )}
    </>
  );
}

export function BookingActions({
  booking,
  isBarber,
  isUpdating,
  isIssuing,
  layout,
  onStatusChange,
  onReschedule,
  onIssueInvoice,
}: BookingActionsProps) {
  const actions = (isBarber ? BARBER_ACTIONS : STAFF_ACTIONS)[booking.status] ?? [];
  const canReschedule =
    !isBarber && (booking.status === 'PENDING' || booking.status === 'CONFIRMED');
  const canIssueInvoice = booking.status === 'COMPLETED';
  const isBusy = isUpdating || isIssuing;

  if (actions.length === 0 && !canReschedule && !canIssueInvoice) {
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
            disabled={isBusy}
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
            disabled={isBusy}
            onClick={onReschedule}
            className="min-h-10 w-full px-3 py-2 text-xs"
          >
            Reprogramar
          </Button>
        )}
        {canIssueInvoice && (
          <Button
            type="button"
            tone="light"
            disabled={isBusy}
            onClick={onIssueInvoice}
            className="col-span-2 min-h-11 w-full px-3 py-2 text-xs"
          >
            {isIssuing ? 'Emitiendo…' : 'Emitir factura'}
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
          disabled={isBusy}
          onClick={() => onStatusChange(primaryAction.to)}
          className="min-h-9 px-3 py-1.5 text-xs"
        >
          {primaryAction.label}
        </Button>
      )}
      {canIssueInvoice && (
        <Button
          type="button"
          tone="light"
          disabled={isBusy}
          onClick={onIssueInvoice}
          className="min-h-9 px-3 py-1.5 text-xs"
        >
          {isIssuing ? 'Emitiendo…' : 'Emitir factura'}
        </Button>
      )}
      {secondaryActions.length > 0 && (
        <ContextActionsMenu actions={secondaryActions} disabled={isBusy} />
      )}
    </div>
  );
}
