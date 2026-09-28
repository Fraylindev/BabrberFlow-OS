'use client';

import { useEffect, useId, useRef } from 'react';

type Tone = 'dark' | 'light';
type Size = 'md' | 'lg';

export function Modal({
  title,
  onClose,
  children,
  tone = 'dark',
  size = 'md',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** "dark" (default — marketing, landing) o "light" (backoffice/dashboard).
   * Retrocompatible: existingconsumers sin tone siguen usando el tema oscuro. */
  tone?: Tone;
  /** Ancho máximo del panel. `md` conserva el comportamiento existente. */
  size?: Size;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const isLight = tone === 'light';

  const overlayBg = isLight ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/70 backdrop-blur-sm';
  const panelBg = isLight
    ? 'border border-[var(--dash-border)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-raised)]'
    : 'border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[var(--shadow-raised)]';
  const titleCls = isLight
    ? 'text-base font-semibold text-[var(--dash-text)]'
    : 'font-[family-name:var(--font-display)] text-lg text-[var(--color-paper)]';
  const closeCls = isLight
    ? 'flex h-8 w-8 items-center justify-center rounded-lg text-[var(--dash-text-muted)] hover:bg-[var(--dash-surface-raised)] hover:text-[var(--dash-text)] cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--dash-accent)]'
    : 'flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-paper)] cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-brass)]';
  const overlayLayout = 'p-3 sm:p-4';
  const panelLayout = isLight ? 'rounded-2xl' : 'rounded-2xl p-6';
  const headerLayout = isLight
    ? 'border-b border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-4 py-3.5 sm:px-5 rounded-t-2xl'
    : 'mb-5';
  const contentLayout = isLight ? 'p-4 sm:p-5' : '';
  const panelWidth = size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] animate-in fade-in ${overlayBg} ${overlayLayout}`}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] animate-in fade-in zoom-in-95 ${panelWidth} ${panelLayout} ${panelBg}`}
      >
        <div className={`flex items-center justify-between gap-4 ${headerLayout}`}>
          <h2 id={titleId} className={titleCls}>
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={closeCls}
          >
            <svg
              className="h-4 w-4 stroke-current"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className={contentLayout}>{children}</div>
      </div>
    </div>
  );
}
