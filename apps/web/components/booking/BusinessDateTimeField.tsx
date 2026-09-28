'use client';
import { InputField } from '@/components/ui/Field';
export function BusinessDateTimeField({
  id,
  name,
  label,
  value,
  onChange,
  required,
  disabled,
}: {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <InputField
        tone="light"
        id={id}
        name={name}
        label={label}
        type="datetime-local"
        step={60}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="text-xs text-[var(--dash-text-muted)]">
        Hora del negocio. Si esa hora se repite o no existe, elige otra.
      </p>
    </div>
  );
}
