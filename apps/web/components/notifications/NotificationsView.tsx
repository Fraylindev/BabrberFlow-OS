'use client';

import Link from 'next/link';
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Organization } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  canManageEmails, canReadBookingEmails, EMAIL_EVENTS, EMAIL_NOTICE_VERSION, EMAIL_STATES,
  formatNotificationDate, notificationError, notificationReason, notificationScope,
  type EmailHistoryPage, type EmailHistoryRow, type EmailPreference, type EmailPreferenceInput,
} from '@/lib/notification-ui';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryPagination } from '@/components/dashboard/SummaryPagination';
import { EmailConsent } from './EmailConsent';

const panelClass = 'rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 sm:p-5';

export function NotificationsView({ bookingId }: { bookingId?: string }) {
  const { user } = useAuth();
  const scope = notificationScope(user);
  if (!scope || !user) return null;
  if (!(bookingId ? canReadBookingEmails(user.role) : canManageEmails(user.role))) {
    return <p role="alert">No tienes permiso para consultar estos avisos.</p>;
  }
  if (bookingId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
    return <p role="alert">Este registro no está disponible.</p>;
  }
  return <NotificationVisit key={`${scope}:${bookingId ?? 'all'}`} scope={scope}
    bookingId={bookingId} mayRetry={canManageEmails(user.role)} />;
}

function NotificationVisit(props: { scope: string; bookingId?: string; mayRetry: boolean }) {
  const [ready, setReady] = useState(false);
  // AuthProvider clears business queries in its scope-change effect. Mount the
  // new observers after that commit so they cannot be removed while fetching.
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  return ready ? <ScopedNotifications {...props} /> : <p role="status">Cargando avisos…</p>;
}

function ScopedNotifications({ scope, bookingId, mayRetry }: {
  scope: string; bookingId?: string; mayRetry: boolean;
}) {
  const visit = useId();
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  useLayoutEffect(() => {
    const current = new AbortController();
    controller.current = current;
    return () => { current.abort(); controller.current = null; };
  }, []);
  const queryClient = useQueryClient();
  const keys = ['notifications', scope, visit, bookingId ?? 'all'];
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [writeError, setWriteError] = useState('');
  // A failed write must be reconciled with GET before another write is offered.
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [selectedRetry, setSelectedRetry] = useState<EmailHistoryRow | null>(null);
  const history = useQuery({
    queryKey: [...keys, 'history', page],
    queryFn: ({ signal }) => api.get<EmailHistoryPage>(bookingId
      ? `/bookings/${bookingId}/notifications` : '/notifications',
    { page: String(page), limit: '20' }, { signal, cache: 'no-store' }),
    gcTime: 0, staleTime: 0, retry: false,
  });
  const preference = useQuery({
    queryKey: [...keys, 'preference'],
    queryFn: ({ signal }) => api.get<EmailPreference>(`/bookings/${bookingId}/email-preference`, undefined,
      { signal, cache: 'no-store' }),
    enabled: Boolean(bookingId), gcTime: 0, staleTime: 0, retry: false,
  });
  const zone = useQuery({
    queryKey: [...keys, 'zone'],
    queryFn: async ({ signal }) => {
      const organization = await api.get<Organization>('/organizations/mine', undefined, { signal, cache: 'no-store' });
      if (!organization.timeZone) throw new Error('Missing business time zone');
      return organization.timeZone;
    },
    gcTime: 0, staleTime: 0, retry: false,
  });
  const write = useMutation({
    mutationFn: async (action: { kind: 'retry'; id: string } | { kind: 'preference'; input: EmailPreferenceInput }) => {
      const current = controller.current;
      if (!current || current.signal.aborted) throw new Error('Inactive visit');
      if (action.kind === 'retry') {
        return api.post<EmailHistoryRow>(`/notifications/${action.id}/retry`, {}, { signal: current.signal });
      }
      return api.patch<EmailPreference>(`/bookings/${bookingId}/email-preference`, action.input, { signal: current.signal });
    },
    retry: false,
  });
  async function submit(action: Parameters<typeof write.mutateAsync>[0]) {
    if (busy.current || needsRefresh) return;
    const current = controller.current;
    if (!current) return;
    busy.current = true;
    setMessage(''); setWriteError('');
    try {
      await write.mutateAsync(action);
      if (current.signal.aborted) return;
      setSelectedRetry(null);
      setMessage(action.kind === 'retry'
        ? 'Reintento solicitado. Consulta el estado para conocer el resultado.'
        : 'Preferencia guardada. Se aplicará a los próximos cambios de esta reserva.');
      await queryClient.invalidateQueries({ queryKey: keys });
    } catch (error) {
      if (current.signal.aborted) return;
      setSelectedRetry(null);
      setWriteError(notificationError(error, action.kind));
      setNeedsRefresh(true);
    } finally {
      if (!current.signal.aborted) busy.current = false;
    }
  }
  async function refresh() {
    const current = controller.current;
    if (!current) return;
    setSelectedRetry(null);
    const results = await Promise.all([history.refetch(), zone.refetch(), ...(bookingId ? [preference.refetch()] : [])]);
    if (current.signal.aborted) return;
    if (results.every((result) => !result.isError)) {
      setNeedsRefresh(false); setWriteError('');
      setRefreshRevision((revision) => revision + 1);
    }
  }
  const reading = history.isFetching || zone.isFetching || (Boolean(bookingId) && preference.isFetching);
  const pending = write.isPending || reading;
  const readError = history.isError ? history.error : zone.isError ? zone.error : null;
  return (
    <div className="min-w-0 space-y-5 text-[var(--dash-text)]">
      <PageHeader tone="light" title={bookingId ? 'Avisos de esta reserva' : 'Notificaciones'}
        description="Consulta los avisos por correo y su resultado. El estado de la reserva se gestiona por separado."
        action={<Button tone="light" variant="secondary" onClick={() => void refresh()} disabled={pending}>Actualizar avisos</Button>} />
      <Link href="/dashboard/bookings" className="inline-block text-sm underline focus-visible:outline-2">Volver a Reservas</Link>
      <p className="text-sm text-[var(--dash-text-muted)]">La aceptación del proveedor y la entrega no acreditan lectura del correo.</p>
      {message && <p role="status" className={panelClass}>{message}</p>}
      {writeError && <div role="alert" className={panelClass}><p>{writeError}</p>
        <Button tone="light" variant="secondary" className="mt-3" disabled={pending} onClick={() => void refresh()}>Consultar estado actual</Button></div>}

      {bookingId && <section className={panelClass} aria-labelledby="email-preference-heading">
        <h2 id="email-preference-heading" className="mb-3 text-lg font-semibold">Preferencia de correo</h2>
        {preference.isError ? <p role="alert">{notificationError(preference.error)}</p>
          : preference.isPending ? <p role="status">Cargando preferencia…</p>
            : preference.data && <PreferenceForm key={`${preference.data.version}:${preference.data.contactReviewed}:${refreshRevision}`}
              preference={preference.data} disabled={pending || needsRefresh}
              onSave={(input) => void submit({ kind: 'preference', input })} />}
      </section>}

      <section aria-labelledby="email-history-heading" className={panelClass}>
        <h2 id="email-history-heading" className="mb-3 text-lg font-semibold">Historial de correo</h2>
        {readError ? <div role="alert"><p>{notificationError(readError)}</p>
          <Button tone="light" variant="secondary" className="mt-3" onClick={() => void refresh()} disabled={pending}>Volver a consultar</Button></div>
          : history.isPending || zone.isPending ? <p role="status">Cargando avisos…</p>
            : history.data && zone.data && <>
              {history.data.data.length === 0 ? <p>{page === 1 ? 'Todavía no hay avisos registrados. Los próximos cambios de las reservas aparecerán aquí.' : 'No hay avisos en esta página. Vuelve a la página anterior.'}</p>
                : <ul className="space-y-3" aria-busy={history.isFetching}>
                  {history.data.data.map((row) => <li key={row.id} className="rounded-lg border border-[var(--dash-border)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-semibold">{EMAIL_EVENTS[row.event] ?? 'Aviso de reserva'}</h3>
                      <span className="rounded-md bg-[var(--dash-surface-raised)] px-2 py-1 text-sm">{EMAIL_STATES[row.status] ?? 'Estado no disponible'}</span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--dash-text-muted)]">{formatNotificationDate(row.createdAt, zone.data!)} · hora del negocio</p>
                    <p className="mt-1 text-sm">Correo · {row.recipientMasked === '***@***' ? 'Destinatario protegido' : 'Sin destinatario conservado'} · Intentos: {row.attempts}</p>
                    {notificationReason(row.reason) && <p className="mt-2 text-sm">{notificationReason(row.reason)}</p>}
                    {row.status === 'UNCERTAIN' && <p className="mt-2 text-sm">El envío necesita revisión. No se puede reintentar desde aquí.</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {!bookingId && <Link className="text-sm underline focus-visible:outline-2" href={`/dashboard/bookings/${row.bookingId}/notifications`}>Ver avisos de la reserva</Link>}
                      {mayRetry && row.canRetry && <Button tone="light" variant="secondary" disabled={pending || needsRefresh}
                        onClick={() => setSelectedRetry(row)}>Reintentar aviso</Button>}
                    </div>
                    {selectedRetry?.id === row.id && <div className="mt-3 space-y-3 rounded-md bg-[var(--dash-surface-raised)] p-3">
                      <p>Se solicitará otro intento de este mismo aviso. El servicio volverá a comprobar si todavía corresponde enviarlo.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button tone="light" disabled={pending || needsRefresh} onClick={() => void submit({ kind: 'retry', id: row.id })}>{write.isPending ? 'Solicitando…' : 'Confirmar reintento'}</Button>
                        <Button tone="light" variant="secondary" disabled={write.isPending} onClick={() => setSelectedRetry(null)}>Ahora no</Button>
                      </div>
                    </div>}
                  </li>)}
                </ul>}
              <SummaryPagination label="Páginas de avisos" page={page} totalPages={history.data.pagination.totalPages}
                onPage={(next) => { if (!write.isPending) { setSelectedRetry(null); setPage(next); } }} />
            </>}
      </section>
    </div>
  );
}

function PreferenceForm({ preference, disabled, onSave }: {
  preference: EmailPreference; disabled: boolean; onSave: (input: EmailPreferenceInput) => void;
}) {
  const [optedIn, setOptedIn] = useState(preference.optedIn);
  const [email, setEmail] = useState('');
  const [reviewed, setReviewed] = useState(false);
  function save(event: FormEvent) {
    event.preventDefault();
    if (disabled || (optedIn && (!reviewed || !email.trim()))) return;
    onSave({ expectedVersion: preference.version, optedIn, noticeVersion: EMAIL_NOTICE_VERSION,
      ...(optedIn ? { reviewedEmail: email.trim() } : {}) });
  }
  return <form onSubmit={save} className="space-y-4">
    <p className="text-sm">Preferencia actual: <strong>{preference.optedIn ? 'Avisos autorizados' : 'Avisos no autorizados'}</strong>.</p>
    {preference.optedIn && !preference.contactReviewed && <p role="status" className="text-sm">El correo necesita una nueva revisión para futuros avisos.</p>}
    <EmailConsent checked={optedIn} onChange={(checked) => { setOptedIn(checked); setReviewed(false); setEmail(''); }} disabled={disabled} />
    {optedIn && <>
      <InputField tone="light" label="Correo revisado con el cliente" type="email" required maxLength={254}
        autoComplete="off" value={email} disabled={disabled}
        onChange={(event) => { setEmail(event.target.value); setReviewed(false); }} />
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={reviewed} disabled={disabled}
        onChange={(event) => setReviewed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 focus-visible:outline-2" />
        <span>El cliente eligió recibir estos avisos y revisé con él su correo registrado.</span></label>
      <p className="text-sm text-[var(--dash-text-muted)]">Debe coincidir con el correo de su ficha. Esta revisión no cambia el contacto ni verifica la propiedad del buzón.</p>
    </>}
    <p className="text-sm text-[var(--dash-text-muted)]">Guardar no envía avisos anteriores. Retirar la preferencia impide nuevos despachos; un correo que ya está en tránsito no puede retirarse.</p>
    <Button tone="light" type="submit" disabled={disabled || (optedIn && (!reviewed || !email.trim()))}>
      {disabled ? 'Espera un momento…' : 'Guardar preferencia'}
    </Button>
  </form>;
}
