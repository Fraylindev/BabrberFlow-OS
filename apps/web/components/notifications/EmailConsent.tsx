'use client';

import { useId } from 'react';
import { EMAIL_NOTICE_TEXT } from '@/lib/notification-ui';

export function EmailConsent({ checked, onChange, disabled = false, tone = 'light' }: {
  checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; tone?: 'light' | 'dark';
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${tone === 'light' ? 'border-[var(--dash-border)] text-[var(--dash-text)]' : 'border-[var(--color-border)] text-[var(--color-paper)]'}`}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--dash-accent)] focus-visible:outline-2 focus-visible:outline-offset-2" />
      <span>{EMAIL_NOTICE_TEXT}</span>
    </label>
  );
}
