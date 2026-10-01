'use client';

import { useState } from 'react';
import { InputField } from '@/components/ui/Field';
import { EmailConsent } from '@/components/notifications/EmailConsent';
import { Button } from '@/components/ui/Button';
import { ACCOUNT_QA_NOTICE, contactErrors } from '@/lib/public-booking-ui';
import { StepWrapper } from './shared';

export function ContactStep({ clientName, clientPhone, clientEmail, emailOptedIn, createAccount = false, password = '',
  onNameChange, onPhoneChange, onEmailChange, onEmailOptInChange, onAccountChange, onPasswordChange, onBack, onNext,
}: {
  clientName: string; clientPhone: string; clientEmail: string; emailOptedIn: boolean; createAccount?: boolean; password?: string;
  onNameChange: (value: string) => void; onPhoneChange: (value: string) => void; onEmailChange: (value: string) => void;
  onEmailOptInChange: (value: boolean) => void; onAccountChange?: (value: boolean) => void; onPasswordChange?: (value: string) => void;
  onBack: () => void; onNext: () => void;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const errors = contactErrors({ clientName, clientPhone, clientEmail, emailOptedIn, createAccount, password });
  const error = (field: keyof typeof errors) => touched[field] ? errors[field] : undefined;
  return <StepWrapper title="Tus datos">
    <form noValidate onSubmit={event => {
      event.preventDefault();
      setTouched({ clientName: true, clientPhone: true, clientEmail: true, password: true });
      const first = Object.keys(errors)[0];
      if (first) document.getElementById(`public-${first}`)?.focus();
      else onNext();
    }}>
      <div className="space-y-5">
        <InputField id="public-clientName" name="clientName" label="Nombre" className="booking-input" autoComplete="name" required maxLength={120}
          value={clientName} error={error('clientName')} onChange={event => onNameChange(event.target.value)} onBlur={() => setTouched(value => ({ ...value, clientName: true }))} />
        <InputField id="public-clientPhone" name="clientPhone" label="Teléfono" className="booking-input" type="tel" inputMode="tel" autoComplete="tel" required maxLength={30}
          aria-describedby="phone-help" value={clientPhone} error={error('clientPhone')} onChange={event => onPhoneChange(event.target.value)} onBlur={() => setTouched(value => ({ ...value, clientPhone: true }))} />
        <p id="phone-help" className="text-sm text-[var(--color-muted)]">Puedes incluir el prefijo internacional, por ejemplo +1 809 555 0100.</p>
        <InputField id="public-clientEmail" name="clientEmail" label="Correo (opcional)" className="booking-input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254}
          value={clientEmail} error={error('clientEmail')} onChange={event => onEmailChange(event.target.value)} onBlur={() => setTouched(value => ({ ...value, clientEmail: true }))} />
        <p className="text-sm leading-6 text-[var(--color-muted)]">El negocio usará estos datos para gestionar tu reserva y comunicarse contigo.</p>
        <EmailConsent tone="dark" checked={emailOptedIn} onChange={onEmailOptInChange} />
        <div className="border border-[var(--color-border)] p-3">
          <p id="account-qa-notice" className="mb-3 text-sm leading-6 text-[var(--color-muted)]">{ACCOUNT_QA_NOTICE}</p>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" name="createAccount" className="h-5 w-5 shrink-0" checked={createAccount} aria-describedby="account-qa-notice"
              onChange={event => { onAccountChange?.(event.target.checked); if (!event.target.checked) onPasswordChange?.(''); }} />
            <span>Crear cuenta para reservar más rápido</span>
          </label>
          {createAccount && <div className="mt-4 space-y-2">
            <InputField id="public-password" name="password" label="Crea una contraseña" className="booking-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} required
              aria-describedby="password-help" value={password} error={error('password')} onChange={event => onPasswordChange?.(event.target.value)} onBlur={() => setTouched(value => ({ ...value, password: true }))} />
            <div className="flex flex-wrap items-center justify-between gap-2"><p id="password-help" className="text-sm text-[var(--color-muted)]">Al menos 8 caracteres.</p>
              <Button type="button" variant="secondary" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</Button>
            </div>
          </div>}
        </div>
      </div>
      <div className="booking-nav"><Button type="button" variant="ghost" onClick={onBack}>Atrás</Button><Button type="submit" className="booking-primary">Revisar reserva</Button></div>
    </form>
  </StepWrapper>;
}
