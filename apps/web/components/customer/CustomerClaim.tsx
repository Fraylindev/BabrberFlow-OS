'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { customerRoutes } from '@/lib/customer-routes';
import { CUSTOMER_ASSISTANCE, customerError } from '@/lib/customer-ui';
import type { CustomerDetail } from '@/lib/queries/customer';
import { usePublicReadWait } from '@/lib/use-public-read-wait';
import { Button } from '@/components/ui/Button';
import { useClaimReference, useCustomer } from './CustomerProvider';

export function CustomerClaim({ bookingId, accountWanted = false }: { bookingId?: string; accountWanted?: boolean }) {
  const session = useCustomer();
  const client = useQueryClient();
  const { reference, remember } = useClaimReference();
  const routes = customerRoutes(session.slug);
  const id = bookingId ?? (reference?.slug === session.slug ? reference.bookingId : null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [failure, setFailure] = useState<{ error: unknown; at: number } | null>(null);
  const wait = usePublicReadWait(failure?.error, failure?.at ?? 0);
  const lock = useRef(false);
  async function claim() {
    if (!id || lock.current || wait > 0 || !session.active()) return;
    lock.current = true; setBusy(true); setMessage(null);
    try {
      await api.post('/auth/clerk/customer/claims', { bookingId: id, organizationSlug: session.slug }, session.options());
      if (!session.active()) return;
      try {
        await api.get<CustomerDetail>(`/customer/${encodeURIComponent(session.slug)}/bookings/${encodeURIComponent(id)}`, undefined, session.options());
        if (!session.active()) return;
        setVisible(true); remember(null); setMessage('La reserva ya aparece en Mis reservas.');
        void client.invalidateQueries({ queryKey: ['customer'] });
      } catch (error) {
        if (!session.active()) return;
        setFailure({ error, at: Date.now() });
        setMessage('Tu reserva sigue registrada. No pudimos mostrarla en Mis reservas para esta cuenta. Contacta al negocio para que revise tu caso.');
      }
    } catch (error) {
      if (!session.active()) return;
      if (error instanceof ApiError && [401, 403].includes(error.status)) session.reject();
      else { setFailure({ error, at: Date.now() }); setMessage(customerError(error, 'claim')); }
    } finally { lock.current = false; if (session.active()) setBusy(false); }
  }
  if (!id && !visible) return null;
  return <section className="customer-card customer-claim space-y-3 rounded-lg border border-[var(--color-border-strong)] p-4" aria-label="Añadir reserva a tu cuenta">
    {!visible && <>
      <Button variant="secondary" onClick={() => { if (id) remember({ bookingId: id, slug: session.slug }); setConfirming(true); }}>Añadir esta reserva a Mis reservas</Button>
      {!session.signedIn && <><p>{accountWanted ? 'Crea tu cuenta para volver a esta reserva.' : 'Crea una cuenta o inicia sesión para continuar.'}</p><nav className="flex flex-wrap gap-4"><Link href={routes.create} onClick={() => { if (id) remember({ bookingId: id, slug: session.slug }); }}>Crear cuenta</Link><Link href={routes.login} onClick={() => { if (id) remember({ bookingId: id, slug: session.slug }); }}>Iniciar sesión</Link></nav></>}
      {confirming && session.signedIn && <><p>Vincularás tu cuenta con tus reservas en este negocio.</p><div className="flex flex-wrap gap-3"><Button aria-busy={busy} disabled={busy || wait > 0} onClick={() => void claim()}>{busy ? 'Añadiendo reserva…' : 'Añadir reserva'}</Button><Button variant="ghost" disabled={busy} onClick={() => { setConfirming(false); remember(null); }}>Ahora no</Button></div></>}
    </>}
    {message && <p role={visible ? 'status' : 'alert'}>{message}</p>}
    {wait > 0 && <p role="status">Puedes volver a probar en {wait} segundos.</p>}
    {failure && !visible && <><p>{CUSTOMER_ASSISTANCE}</p><Link href={routes.root}>Contactar al negocio</Link></>}
    {visible && bookingId && <Link href={routes.bookings}>Ver Mis reservas</Link>}
  </section>;
}
