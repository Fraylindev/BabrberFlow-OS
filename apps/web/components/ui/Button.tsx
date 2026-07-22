"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-brass)] text-[var(--color-ink)] hover:bg-[var(--color-brass-hover)] disabled:opacity-50",
  secondary:
    "bg-[var(--color-surface-raised)] text-[var(--color-paper)] border border-[var(--color-border-strong)] hover:border-[var(--color-brass)] disabled:opacity-50",
  ghost:
    "text-[var(--color-muted)] hover:text-[var(--color-paper)] disabled:opacity-50",
  danger:
    "bg-transparent text-[var(--color-danger)] border border-[var(--color-danger)]/40 hover:bg-[var(--color-danger-bg)] disabled:opacity-50",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-medium tracking-wide transition-colors cursor-pointer disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = "Button";
