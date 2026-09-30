"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";
import { FieldWrapper } from "./Field";

interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const fieldId = id || props.name || label;

    return (
      <FieldWrapper label={label} error={error} htmlFor={fieldId}>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={visible ? "text" : "password"}
            className={`${className ?? "w-full min-w-0 rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-2 pr-16 text-base sm:text-sm text-[var(--color-paper)] placeholder:text-[var(--color-faint)] outline-none focus:border-[var(--color-brass)] transition-colors"} max-sm:text-base`}
            {...props}
            aria-invalid={error ? true : props['aria-invalid']}
            aria-describedby={[props['aria-describedby'], error ? `${fieldId.replace(/\s+/g, '-')}-error` : null].filter(Boolean).join(' ') || undefined}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted)] hover:text-[var(--color-paper)] cursor-pointer"
            tabIndex={-1}
          >
            {visible ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </FieldWrapper>
    );
  },
);
PasswordField.displayName = "PasswordField";
