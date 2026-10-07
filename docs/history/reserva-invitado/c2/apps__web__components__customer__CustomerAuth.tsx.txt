'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSignIn, useSignUp } from '@clerk/nextjs/legacy';
import { useEffect, useRef, useState } from 'react';
import { useCustomer } from './CustomerProvider';
import { CustomerShell } from './CustomerShell';
import { Button } from '@/components/ui/Button';
import { customerReturn, customerRoutes } from '@/lib/customer-routes';
import { CUSTOMER_ASSISTANCE } from '@/lib/customer-ui';

export function CustomerAuth({ mode, next }: { mode: 'create' | 'login' | 'recover'; next: string | null }) {
  const session = useCustomer();
  const routes = customerRoutes(session.slug);
  const router = useRouter();
  const signup = useSignUp();
  const signin = useSignIn();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailAddressId, setEmailAddressId] = useState<string | null>(null);
  const [resendUntil, setResendUntil] = useState(0);
  const [now, setNow] = useState(0);
  const lock = useRef(false);
  const live = useRef(true);
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => { if (Object.keys(errors).length) summary.current?.focus(); }, [errors]);
  useEffect(() => { if (!resendUntil) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [resendUntil]);
  const remaining = Math.max(0, Math.ceil((resendUntil - now) / 1000));
  async function send(resend = false) {
    if (lock.current || !signup.isLoaded || !signin.isLoaded || resendUntil > Date.now()) return;
    const invalid: Record<string, string> = {};
    if (mode === 'create' && (!name.trim() || name.trim().length > 120)) invalid.name = 'Escribe un nombre de hasta 120 caracteres.';
    if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.trim()) || email.length > 254) invalid.email = 'Revisa el correo.';
    setErrors(invalid); if (Object.keys(invalid).length) return;
    lock.current = true; setBusy(true); setMessage(null);
    try {
      if (mode === 'create') {
        if (!resend) await signup.signUp.create({ firstName: name.trim(), emailAddress: email.trim() });
        if (!live.current) return;
        await signup.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else {
        let id = emailAddressId;
        if (!resend) {
          const attempt = await signin.signIn.create({ identifier: email.trim() });
          const factor = attempt.supportedFirstFactors?.find(factor => factor.strategy === 'email_code');
          if (!factor || factor.strategy !== 'email_code') throw new Error('Método no disponible');
          id = factor.emailAddressId;
        }
        if (!id || !live.current) return;
        await signin.signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: id });
        if (live.current) setEmailAddressId(id);
      }
      if (!live.current) return;
      setVerifying(true); setCode(''); setMessage('Revisa tu correo para continuar.'); setResendUntil(Date.now() + 60_000); setNow(Date.now());
    } catch {
      if (live.current) {
        setMessage(mode === 'create' ? 'No pudimos crear la cuenta. Puedes intentarlo de nuevo o ir a Iniciar sesión. Si ya registraste una reserva, sigue registrada.' : 'No pudimos continuar. Revisa tus datos e inténtalo de nuevo o solicita asistencia.');
        setResendUntil(Date.now() + 60_000); setNow(Date.now());
      }
    } finally { lock.current = false; if (live.current) setBusy(false); }
  }
  async function verify() {
    if (lock.current || !signup.isLoaded || !signin.isLoaded) return;
    if (!/^\d{6}$/.test(code.trim())) { setErrors({ code: 'Escribe el código de 6 dígitos.' }); return; }
    setErrors({}); lock.current = true; setBusy(true); setMessage(null);
    try {
      const result = mode === 'create' ? await signup.signUp.attemptEmailAddressVerification({ code: code.trim() }) : await signin.signIn.attemptFirstFactor({ strategy: 'email_code', code: code.trim() });
      if (!live.current) return;
      if (result.status !== 'complete' || !result.createdSessionId) { setMessage('No pudimos completar el acceso. Contacta al negocio para recibir asistencia.'); return; }
      const setActive = mode === 'create' ? signup.setActive : signin.setActive;
      const accessPath = window.location.pathname;
      await setActive({ session: result.createdSessionId });
      if (window.location.pathname === accessPath) router.replace(customerReturn(session.slug, next));
    } catch { if (live.current) setMessage('No pudimos verificar el código. Revísalo o solicita uno nuevo.'); }
    finally { lock.current = false; if (live.current) setBusy(false); }
  }
  const title = mode === 'create' ? 'Crea una cuenta para volver a tus reservas' : mode === 'recover' ? 'Recuperar acceso' : 'Iniciar sesión';
  return <CustomerShell title={title} privatePage={false}>
    {session.signedIn ? <><p>Ya tienes una sesión abierta.</p><Link href={customerReturn(session.slug, next)}>Continuar a tus reservas</Link></> : <>
      <div className="customer-form-block">
      <p className="customer-muted customer-form-intro">{mode === 'recover' ? 'Verifica tu correo para volver a entrar. También puedes volver a Iniciar sesión.' : 'Usa un código por correo para continuar.'}</p>
      <form noValidate onSubmit={event => { event.preventDefault(); void (verifying ? verify() : send()); }}>
        {Object.keys(errors).length > 0 && <div ref={summary} className="customer-error-summary" tabIndex={-1} role="alert"><p>Revisa estos datos:</p><ul>{Object.entries(errors).map(([field, error]) => <li key={field}><a href={`#customer-${field}`}>{error}</a></li>)}</ul></div>}
        {!verifying && <>
          {mode === 'create' && <div><label htmlFor="customer-name">Nombre</label><input id="customer-name" name="name" autoComplete="name" maxLength={120} value={name} onChange={event => setName(event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'customer-name-error' : undefined} />{errors.name && <p id="customer-name-error" className="customer-error">{errors.name}</p>}</div>}
          <div><label htmlFor="customer-email">Correo</label><input id="customer-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} value={email} onChange={event => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'customer-email-error' : undefined} />{errors.email && <p id="customer-email-error" className="customer-error">{errors.email}</p>}</div>
        </>}
        {verifying && <div><label htmlFor="customer-code">Código por correo</label><input id="customer-code" name="code" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} maxLength={6} value={code} onChange={event => setCode(event.target.value)} aria-invalid={Boolean(errors.code)} aria-describedby={errors.code ? 'customer-code-error' : undefined} />{errors.code && <p id="customer-code-error" className="customer-error">{errors.code}</p>}</div>}
        {message && <p role={verifying && message === 'Revisa tu correo para continuar.' ? 'status' : 'alert'}>{message}</p>}
        <Button type="submit" aria-busy={busy} disabled={busy || !signup.isLoaded || !signin.isLoaded || (!verifying && remaining > 0)}>{busy ? 'Comprobando…' : verifying ? 'Verificar código' : mode === 'create' ? 'Crear cuenta' : 'Enviar código'}</Button>
        {verifying && <><Button type="button" variant="secondary" disabled={busy || remaining > 0} onClick={() => void send(true)}>Enviar otro código</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => { setVerifying(false); setCode(''); setMessage(null); }}>Usar otro correo</Button></>}
        {remaining > 0 && <p role="status">Puedes solicitar otro código en {remaining} segundos.</p>}
        <div id="clerk-captcha" />
      </form>
      </div>
      <nav aria-label="Opciones de acceso">{mode !== 'create' && <Link href={routes.create}>Crear cuenta</Link>}{mode !== 'login' && <Link href={routes.login}>Iniciar sesión</Link>}{mode !== 'recover' && <Link href={routes.recover}>Recuperar acceso</Link>}</nav>
      {mode === 'recover' && <><p>{CUSTOMER_ASSISTANCE}</p><Link href={routes.root}>Contactar al negocio</Link></>}
    </>}
  </CustomerShell>;
}
