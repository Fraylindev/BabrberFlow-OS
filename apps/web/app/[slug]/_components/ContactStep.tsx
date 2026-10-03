'use client';

import { useState } from 'react';
import { InputField } from '@/components/ui/Field';
import { EmailConsent } from '@/components/notifications/EmailConsent';
import { Button } from '@/components/ui/Button';
import { ACCOUNT_QA_NOTICE, contactErrors } from '@/lib/public-booking-ui';
import { StepWrapper } from './shared';
import { PhoneField } from '@/components/public/PhoneField';
import { EMPTY_PHONE, changePhoneNumber, phonePrefixError, phoneValue, type PhoneDraft } from '@/lib/public-phone';

export function ContactStep({ clientName, clientPhone, clientEmail, emailOptedIn, createAccount = false,
  onNameChange, onPhoneChange, onEmailChange, onEmailOptInChange, onAccountChange, onBack, onNext, phone: suppliedPhone, onPhoneDraftChange,
}: {
  clientName: string; clientPhone: string; clientEmail: string; emailOptedIn: boolean; createAccount?: boolean;
  onNameChange: (value: string) => void; onPhoneChange: (value: string) => void; onEmailChange: (value: string) => void;
  onEmailOptInChange: (value: boolean) => void; onAccountChange?: (value: boolean) => void;
  onBack: () => void; onNext: () => void;
  phone?: PhoneDraft; onPhoneDraftChange?: (value: PhoneDraft) => void;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const phone = suppliedPhone ?? changePhoneNumber(EMPTY_PHONE, clientPhone);
  const errors = contactErrors({ clientName, clientPhone, clientEmail, emailOptedIn, createAccount });
  const prefixError = phonePrefixError(phone);
  if (prefixError) errors.clientPhone = prefixError;
  const error = (field: keyof typeof errors) => touched[field] ? errors[field] : undefined;
  return <StepWrapper title="Tus datos">
    <form noValidate onSubmit={event => {
      event.preventDefault();
      setTouched({ clientName: true, clientPhone: true, clientEmail: true });
      const first = Object.keys(errors)[0];
      if (first) document.getElementById(`public-${first}`)?.focus();
      else onNext();
    }}>
      <div className="space-y-5">
        <InputField id="public-clientName" name="clientName" label="Nombre" className="booking-input" autoComplete="name" required maxLength={120}
          value={clientName} error={error('clientName')} onChange={event => onNameChange(event.target.value)} onBlur={() => setTouched(value => ({ ...value, clientName: true }))} />
        <PhoneField draft={phone} error={error('clientPhone')} onChange={value => { onPhoneDraftChange?.(value); onPhoneChange(phoneValue(value)); }} onBlur={() => setTouched(value => ({ ...value, clientPhone: true }))} />
        <InputField id="public-clientEmail" name="clientEmail" label="Correo (opcional)" className="booking-input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254}
          value={clientEmail} error={error('clientEmail')} onChange={event => onEmailChange(event.target.value)} onBlur={() => setTouched(value => ({ ...value, clientEmail: true }))} />
        <p className="text-sm leading-6 text-[var(--color-muted)]">El negocio usará tus datos para gestionar tu reserva.</p>
        <EmailConsent tone="dark" checked={emailOptedIn} onChange={onEmailOptInChange} />
        <div className="border border-[var(--color-border)] p-3">
          <p id="account-qa-notice" className="mb-3 text-sm leading-6 text-[var(--color-muted)]">{ACCOUNT_QA_NOTICE}</p>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" name="createAccount" className="h-5 w-5 shrink-0" checked={createAccount} aria-describedby="account-qa-notice"
              onChange={event => onAccountChange?.(event.target.checked)} />
            <span>Crear cuenta para reservar más rápido</span>
          </label>
        </div>
      </div>
      <div className="booking-nav"><Button type="button" variant="ghost" onClick={onBack}>Atrás</Button><Button type="submit" className="booking-primary">Revisar reserva</Button></div>
    </form>
  </StepWrapper>;
}
