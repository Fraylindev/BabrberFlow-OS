"use client";

import { useState, ReactNode } from "react";

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: string;
  children: ReactNode;
  /** "top" (por defecto) o "right" — para triggers pegados al borde
   * izquierdo, como los íconos de un sidebar colapsado. */
  side?: "top" | "right";
}) {
  const [visible, setVisible] = useState(false);

  const positionClasses =
    side === "right"
      ? "left-full top-1/2 ml-2 -translate-y-1/2"
      : "bottom-full left-1/2 mb-2 -translate-x-1/2";

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-30 whitespace-nowrap rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-paper)] shadow-lg ${positionClasses}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
