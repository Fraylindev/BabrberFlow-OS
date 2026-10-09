'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { commandCanRetry, customerError, profileErrors, uncertainCustomerWrite, type CustomerCommand } from '@/lib/customer-ui';
import { useCustomerRead, useCustomerRevalidation, type CustomerProfile as Profile } from '@/lib/queries/customer';
import { usePublicReadWait } from '@/lib/use-public-read-wait';
import { Button } from '@/components/ui/Button';
import { CustomerShell } from './CustomerShell';
import { useCustomer } from './CustomerProvider';

export function CustomerProfile() { return <CustomerShell title="Mi perfil"><ProfileContent /></CustomerShell>; }
function ProfileContent() {
  const session = useCustomer();
  const path = `/customer/${encodeURIComponent(session.slug)}/profile`;
  const query = useCustomerRead<Profile>(path);
  const wait = usePublicReadWait(query.error, query.errorUpdatedAt);
  const refetch = query.refetch;
  const refresh = useCallback(() => { if (!wait) void refetch(); }, [refetch, wait]);
  useCustomerRevalidation(refresh, wait === 0);
  return <>
    {(query.isFetching || query.isLoading) && <p role="status">Cargando tu perfil…</p>}
    {query.error && <div role="alert"><p>{customerError(query.error)}</p>{wait > 0 && <p>Puedes volver a consultar en {wait} segundos.</p>}<Button disabled={wait > 0 || query.isFetching} onClick={refresh}>Reintentar</Button></div>}
    {query.data && <div hidden={query.isFetching || Boolean(query.error)}><ProfileForm initial={query.data} /></div>}
  </>;
}
function ProfileForm({ initial }: { initial: Profile }) {
  const session = useCustomer();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [profile, setProfile] = useState(initial);
  const [errors, setErrors] = useState<ReturnType<typeof profileErrors>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [failure, setFailure] = useState<{ error: unknown; at: number } | null>(null);
  const [expired, setExpired] = useState(false);
  const wait = usePublicReadWait(failure?.error, failure?.at ?? 0);
  const command = useRef<CustomerCommand<{ name: string; phone: string | null }> | null>(null);
  const lock = useRef(false);
  const dirty = useRef(false);
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => { if (Object.keys(errors).length) summary.current?.focus(); }, [errors]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setProfile(initial);
      if (!command.current && !dirty.current) { setName(initial.name); setPhone(initial.phone ?? ''); }
    });
    return () => cancelAnimationFrame(frame);
  }, [initial]);
  async function save() {
    if (lock.current || wait > 0 || expired || !profile.canEditContact) return;
    const invalid = profileErrors(name, phone); setErrors(invalid); if (Object.keys(invalid).length) return;
    command.current ??= { key: crypto.randomUUID(), body: { name: name.trim(), phone: phone.trim() || null }, createdAt: Date.now() };
    if (!commandCanRetry(command.current)) { setExpired(true); setMessage('El plazo para comprobar este envío terminó. Vuelve a cargar tu perfil y revisa los datos antes de hacer otro cambio.'); return; }
    lock.current = true; setBusy(true); setMessage(null);
    try {
      const response = await api.patch<Profile>(`/customer/${encodeURIComponent(session.slug)}/profile`, command.current.body, { ...session.options(), headers: { 'Idempotency-Key': command.current.key } });
      if (!session.active()) return;
      setProfile(response); setName(response.name); setPhone(response.phone ?? ''); setUncertain(false); command.current = null; dirty.current = false; setFailure(null); setMessage('Tus datos se guardaron para este negocio.');
    } catch (error) {
      if (!session.active()) return;
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) session.reject();
      else {
        const unknown = uncertainCustomerWrite(error); setUncertain(unknown); setFailure({ error, at: Date.now() });
        setMessage(unknown ? 'No pudimos comprobar si tus datos se guardaron. Reintenta el mismo envío o vuelve a cargar tu perfil.' : customerError(error, 'profile'));
        if (!unknown) command.current = null;
      }
    } finally { lock.current = false; if (session.active()) setBusy(false); }
  }
  return <div className="customer-form-block">
    <div><h2 className="customer-profile-heading">Datos para este negocio</h2><p className="customer-muted customer-form-intro">Estos cambios solo se guardan aquí. La identidad y verificación de correo se gestionan con tu cuenta.</p></div>
    <form noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      {Object.keys(errors).length > 0 && <div ref={summary} className="customer-error-summary" tabIndex={-1} role="alert"><p>Revisa estos datos:</p><ul>{Object.entries(errors).map(([field, error]) => <li key={field}><a href={`#profile-${field}`}>{error}</a></li>)}</ul></div>}
      <div><label htmlFor="profile-name">Nombre</label><input id="profile-name" name="name" autoComplete="name" maxLength={120} value={name} onChange={event => { dirty.current = true; setName(event.target.value); }} disabled={busy || uncertain || expired || !profile.canEditContact} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'profile-name-error' : undefined} />{errors.name && <p id="profile-name-error" className="customer-error">{errors.name}</p>}</div>
      <div><label htmlFor="profile-phone">Teléfono (opcional)</label><input id="profile-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={phone} onChange={event => { dirty.current = true; setPhone(event.target.value); }} disabled={busy || uncertain || expired || !profile.canEditContact} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'profile-phone-error' : undefined} />{errors.phone && <p id="profile-phone-error" className="customer-error">{errors.phone}</p>}</div>
      <div><label htmlFor="profile-email">Correo de contacto</label><input id="profile-email" name="email" type="email" autoComplete="email" readOnly value={profile.email ?? ''} /><p className="customer-muted">Solo lectura. Cambiar el correo de tu cuenta no cambia este contacto automáticamente.</p></div>
      {profile.canEditContact ? <Button type="submit" aria-busy={busy} disabled={busy || wait > 0 || expired}>{busy ? 'Guardando tus datos…' : uncertain ? 'Reintentar el mismo envío' : 'Guardar datos'}</Button> : <p>Contacta al negocio para revisar tus datos.</p>}
      {message && <p role={message === 'Tus datos se guardaron para este negocio.' ? 'status' : 'alert'}>{message}</p>}
      {wait > 0 && <p role="status">Puedes volver a probar en {wait} segundos.</p>}
    </form>
  </div>;
}
