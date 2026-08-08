"use client";

import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";

interface FieldWrapperProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  htmlFor: string;
}

export function FieldWrapper({ label, error, children, htmlFor }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs uppercase tracking-wider text-[var(--color-muted)]"
      >
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

const inputClasses =
  "w-full rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm text-[var(--color-paper)] placeholder:text-[var(--color-faint)] outline-none focus:border-[var(--color-brass)] transition-colors";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, id, ...props }, ref) => {
    const fieldId = id || props.name || label;
    return (
      <FieldWrapper label={label} error={error} htmlFor={fieldId}>
        <input ref={ref} id={fieldId} className={inputClasses} {...props} />
      </FieldWrapper>
    );
  },
);
InputField.displayName = "InputField";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, id, children, ...props }, ref) => {
    const fieldId = id || props.name || label;
    return (
      <FieldWrapper label={label} error={error} htmlFor={fieldId}>
        <select ref={ref} id={fieldId} className={inputClasses} {...props}>
          {children}
        </select>
      </FieldWrapper>
    );
  },
);
SelectField.displayName = "SelectField";
