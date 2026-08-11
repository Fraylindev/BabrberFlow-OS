"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    ? "text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] cursor-pointer transition-colors"
    : "text-[var(--color-muted)] hover:text-[var(--color-paper)] cursor-pointer";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${overlayBg} p-4`}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full max-w-md rounded-sm p-6 ${panelBg}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className={titleCls}>{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className={closeCls}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
