"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Tone = "dark" | "light";

const DARK_VARIANTS: Record<Variant, string> = {
  primary:
    "relative overflow-hidden bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-brass-hover)] disabled:opacity-50 cta-sheen-hover",
  secondary:
    "bg-[var(--color-surface-raised)] text-[var(--color-paper)] border border-[var(--color-border-strong)] hover:border-[var(--color-brass)] disabled:opacity-50",
  ghost:
    "text-[var(--color-muted)] hover:text-[var(--color-paper)] disabled:opacity-50",
  danger:
    "bg-transparent text-[var(--color-danger)] border border-[var(--color-danger)]/40 hover:bg-[var(--color-danger-bg)] disabled:opacity-50",
};

// Tema claro del Backoffice — mismas 4 variantes, resueltas sobre
// --dash-* en vez de --color-*. Clases completas por combinación a
// propósito (ver nota en Card.tsx sobre Tailwind y strings compuestos).
const LIGHT_VARIANTS: Record<Variant, string> = {
  primary:
    "relative overflow-hidden bg-[var(--dash-accent)] text-white hover:bg-[var(--dash-accent-hover)] disabled:opacity-50",
  secondary:
    "bg-[var(--dash-surface)] text-[var(--dash-text)] border border-[var(--dash-border-strong)] hover:border-[var(--dash-accent)] disabled:opacity-50",
  ghost:
    "text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] disabled:opacity-50",
  danger:
    "bg-transparent text-[var(--dash-danger)] border border-[var(--dash-danger)]/40 hover:bg-[#fee2e2] disabled:opacity-50",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** "dark" (por defecto, marketing/módulos aún sin migrar) o "light"
   * (Backoffice). */
  tone?: Tone;
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", tone = "dark", className = "", ...props }, ref) => {
    const variants = tone === "light" ? LIGHT_VARIANTS : DARK_VARIANTS;
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-medium tracking-wide transition-[colors,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] cursor-pointer active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${className}`}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
