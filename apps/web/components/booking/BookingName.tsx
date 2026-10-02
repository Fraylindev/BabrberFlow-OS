'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** El nombre completo se puede consultar con mouse o teclado sin recortar la tabla. */
export function BookingName({ name }: { name?: string }) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const tooltip = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  function cancelClose() { if (closeTimer.current) clearTimeout(closeTimer.current); }
  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  useLayoutEffect(() => {
    if (!open || !anchor.current || !tooltip.current) return;
    const rect = anchor.current.getBoundingClientRect();
    const box = tooltip.current.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(rect.left, document.documentElement.clientWidth - box.width - 8)),
      top: rect.bottom + box.height + 12 <= innerHeight ? rect.bottom + 4 : Math.max(8, rect.top - box.height - 4),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    document.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const target = typeof document === 'undefined' ? null : document.querySelector('.dashboard-shell');
  return <>
    <span ref={anchor} tabIndex={0} aria-describedby={open ? id : undefined}
      onMouseEnter={() => { cancelClose(); setOpen(true); }} onMouseLeave={scheduleClose}
      onFocus={() => { cancelClose(); setOpen(true); }} onBlur={() => setOpen(false)}
      className="block truncate rounded-sm text-[var(--dash-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dash-accent)]">
      {name || '—'}
    </span>
    {open && target && createPortal(<span ref={tooltip} id={id} role="tooltip"
      onMouseEnter={cancelClose} onMouseLeave={scheduleClose}
      style={{ top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? 'visible' : 'hidden', transition: 'none' }}
      className="fixed z-[120] max-w-[min(20rem,calc(100vw-1rem))] break-words rounded-md border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] px-3 py-2 text-sm text-[var(--dash-text)] shadow-lg">
      {name || '—'}
    </span>, target)}
  </>;
}
