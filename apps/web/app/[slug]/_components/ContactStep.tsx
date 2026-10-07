'use client';

import { useState } from 'react';
import { InputField } from '@/components/ui/Field';
import { EmailConsent } from '@/components/notifications/EmailConsent';
import { Button } from '@/components/ui/Button';
import { contactErrors } from '@/lib/public-booking-ui';
import { StepWrapper } from './shared';
import { PhoneField } from '@/components/public/PhoneField';
import { EMPTY_PHONE, changePhoneNumber, phonePrefixError, phoneValue, type PhoneDraft } from '@/lib/public-phone';

export function ContactStep({ clientName, clientPhone, clientEmail, emailOptedIn,
  onNameChange, onPhoneChange, onEmailChange, onEmailOptInChange, onBack, onNext, phone: suppliedPhone, onPhoneDraftChange,
}: {
  clientName: string; clientPhone: string; clientEmail: string; emailOptedIn: boolean;
  onNameChange: (value: string) => void; onPhoneChange: (value: string) => void; onEmailChange: (value: string) => void;
  onEmailOptInChange: (value: boolean) => void;
  onBack: () => void; onNext: () => void;
  phone?: PhoneDraft; onPhoneDraftChange?: (value: PhoneDraft) => void;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const phone = suppliedPhone ?? changePhoneNumber(EMPTY_PHONE, clientPhone);
  const errors = contactErrors({ clientName, clientPhone, clientEmail, emailOptedIn });
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

      </div>
      <div className="booking-nav"><Button type="button" variant="ghost" onClick={onBack}>Atrás</Button><Button type="submit" className="booking-primary">Revisar reserva</Button></div>
    </form>
  </StepWrapper>;
}
