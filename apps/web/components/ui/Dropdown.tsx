"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface DropdownItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export function Dropdown({
  trigger,
  items,
  placement = "bottom",
  fullWidth = false,
  panelClassName,
  itemClassName,
}: {
  trigger: ReactNode;
  items: DropdownItem[];
  /** "bottom" (por defecto) o "top" — para triggers pegados al borde
   * inferior de la pantalla. */
  placement?: "bottom" | "top";
  /** El trigger ocupa todo el ancho de su contenedor. Por defecto se
   * ajusta al contenido. */
  fullWidth?: boolean;
  /** Sobrescribe el color del panel — por defecto usa los tokens de
   * marketing (--color-*); un consumidor en otro scope de tema (ej. el
   * shell del dashboard) puede pasar sus propias clases aquí sin que
   * este componente necesite saber en qué tema vive. */
  panelClassName?: string;
  itemClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={ref} className={`relative ${fullWidth ? "block w-full" : "inline-block"}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`cursor-pointer ${fullWidth ? "w-full" : ""}`}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={
            panelClassName ??
            `absolute right-0 z-20 min-w-40 overflow-hidden rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-lg ${
              placement === "top" ? "bottom-full mb-1" : "mt-1"
            }`
          }
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={
                itemClassName ??
                `block w-full cursor-pointer px-4 py-2 text-left text-sm whitespace-nowrap hover:bg-[var(--color-surface-raised)] ${
                  item.danger ? "text-[var(--color-danger)]" : "text-[var(--color-paper)]"
                }`
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
