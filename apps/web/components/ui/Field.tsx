"use client";

import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";

type Tone = "dark" | "light";

interface FieldWrapperProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  htmlFor: string;
  tone?: Tone;
}

export function FieldWrapper({ label, error, children, htmlFor, tone = "dark" }: FieldWrapperProps) {
  const labelCls =
    tone === "light"
      ? "text-xs font-medium uppercase tracking-wider text-[var(--dash-text-muted)]"
      : "text-xs uppercase tracking-wider text-[var(--color-muted)]";
  const errorCls =
    tone === "light"
      ? "text-xs text-[var(--dash-danger)]"
      : "text-xs text-[var(--color-danger)]";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
      </label>
      {children}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  );
}

// Clases de input: una por tono, completas, sin composición dinámica
// (Tailwind purga solo strings literales — ver Button.tsx y Card.tsx).
const DARK_INPUT =
  "w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm text-[var(--color-paper)] placeholder:text-[var(--color-faint)] outline-none focus:border-[var(--color-brass)] transition-colors";
const LIGHT_INPUT =
  "w-full rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] px-3 py-2 text-sm text-[var(--dash-text)] placeholder:text-[var(--dash-text-faint)] outline-none focus:border-[var(--dash-accent)] transition-colors";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  tone?: Tone;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, id, tone = "dark", ...props }, ref) => {
    const fieldId = id || props.name || label;
    return (
      <FieldWrapper label={label} error={error} htmlFor={fieldId} tone={tone}>
        <input
          ref={ref}
          id={fieldId}
          className={tone === "light" ? LIGHT_INPUT : DARK_INPUT}
          {...props}
        />
      </FieldWrapper>
    );
  },
);
InputField.displayName = "InputField";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  tone?: Tone;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, id, children, tone = "dark", ...props }, ref) => {
    const fieldId = id || props.name || label;
    return (
      <FieldWrapper label={label} error={error} htmlFor={fieldId} tone={tone}>
        <select
          ref={ref}
          id={fieldId}
          className={tone === "light" ? LIGHT_INPUT : DARK_INPUT}
          {...props}
        >
          {children}
        </select>
      </FieldWrapper>
    );
  },
);
SelectField.displayName = "SelectField";
