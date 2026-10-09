"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";
import { FieldWrapper } from "./Field";

interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  hint?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, hint, id, className, style, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const fieldId = id || props.name || label;

    return (
      <FieldWrapper label={label} error={error} htmlFor={fieldId}>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={visible ? "text" : "password"}
            className={`${className ?? "w-full min-w-0 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-2 text-base sm:text-sm text-[var(--color-paper)] placeholder:text-[var(--color-faint)] outline-none focus:border-[var(--color-brass)] transition-colors"} max-sm:text-base`}
            style={{ ...style, paddingRight: '3.5rem', minHeight: 48 }}
            {...props}
            aria-invalid={error ? true : props['aria-invalid']}
            aria-describedby={[props['aria-describedby'], error ? `${fieldId.replace(/\s+/g, '-')}-error` : hint ? `${fieldId}-hint` : null].filter(Boolean).join(' ') || undefined}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-paper)] cursor-pointer"
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            aria-controls={fieldId}
          >
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
              <path d="m3 3 18 18" style={{ strokeDasharray: 26, strokeDashoffset: visible ? 0 : 26, transition: 'stroke-dashoffset 150ms ease' }} />
            </svg>
          </button>
        </div>
        {hint && !error && <p id={`${fieldId}-hint`} className="text-sm text-[var(--color-muted)]">{hint}</p>}
        <span className="sr-only" aria-live="polite">{visible ? 'Contraseña visible' : 'Contraseña oculta'}</span>
      </FieldWrapper>
    );
  },
);
PasswordField.displayName = "PasswordField";
