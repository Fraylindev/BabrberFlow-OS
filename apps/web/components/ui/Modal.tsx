"use client";

import { useEffect, useId, useRef } from "react";

type Tone = "dark" | "light";

export function Modal({
  title,
  onClose,
  children,
  tone = "dark",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** "dark" (default — marketing, landing) o "light" (backoffice/dashboard).
   * Retrocompatible: existingconsumers sin tone siguen usando el tema oscuro. */
  tone?: Tone;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !panelRef.current) return;

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
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const isLight = tone === "light";

  const overlayBg = isLight ? "bg-black/40" : "bg-black/60";
  const panelBg = isLight
    ? "border border-[var(--dash-border)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-raised)]"
    : "border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-xl";
  const titleCls = isLight
    ? "text-base font-semibold text-[var(--dash-text)]"
    : "font-[family-name:var(--font-display)] text-lg text-[var(--color-paper)]";
  const closeCls = isLight
    ? "flex h-9 w-9 items-center justify-center rounded-md text-[var(--dash-text-muted)] hover:bg-[var(--dash-surface-raised)] hover:text-[var(--dash-text)] cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--dash-accent)]"
    : "text-[var(--color-muted)] hover:text-[var(--color-paper)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brass)]";
  const overlayLayout = isLight ? "p-3 backdrop-blur-[1px] sm:p-4" : "p-4";
  const panelLayout = isLight ? "rounded-xl" : "rounded-sm p-6";
  const headerLayout = isLight
    ? "border-b border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-4 py-3.5 sm:px-5"
    : "mb-5";
  const contentLayout = isLight ? "p-4 sm:p-5" : "";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${overlayBg} ${overlayLayout}`}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto ${panelLayout} ${panelBg}`}
      >
        <div className={`flex items-center justify-between gap-4 ${headerLayout}`}>
          <h2 id={titleId} className={titleCls}>{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={closeCls}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className={contentLayout}>{children}</div>
      </div>
    </div>
  );
}
