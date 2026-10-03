'use client';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { api, ApiError, type PublicAvailabilitySlot } from '@/lib/api';
import { customerRoutes, validBookingId } from '@/lib/customer-routes';
import { commandCanRetry, customerError, customerStatus, uncertainCustomerWrite, type CustomerCommand } from '@/lib/customer-ui';
import { useCustomerRead, useCustomerRevalidation, type CustomerBusiness, type CustomerDetail, type CustomerProfile } from '@/lib/queries/customer';
import { usePublicBookingData } from '@/lib/queries/public-booking';
import { usePublicReadWait } from '@/lib/use-public-read-wait';
import { EMAIL_NOTICE_VERSION } from '@/lib/notification-ui';
import { CustomerShell } from './CustomerShell';
import { useCustomer } from './CustomerProvider';
import { Button } from '@/components/ui/Button';
import { BusinessTime } from '@/components/ui/BusinessTime';
import { EmailConsent } from '@/components/notifications/EmailConsent';
import { ServiceStep } from '@/app/[slug]/_components/ServiceStep';
import { ProfessionalStep } from '@/app/[slug]/_components/ProfessionalStep';
import { DateTimeStep } from '@/app/[slug]/_components/DateTimeStep';
import { formatMoney } from '@/app/[slug]/_components/shared';
import '@/components/public/booking.css';

interface BookingInput { serviceId: string; professionalId: string; startTime: string; emailNotifications?: { optedIn: boolean; noticeVersion: string } }
export function CustomerRepeatBooking({ id }: { id: string }) { return <CustomerShell title="Reservar otra vez"><RepeatContent id={id} /></CustomerShell>; }
function RepeatContent({ id }: { id: string }) {
  const session = useCustomer();
  const routes = customerRoutes(session.slug);
  const visit = useId();
  const detail = useCustomerRead<CustomerDetail>(`/customer/${encodeURIComponent(session.slug)}/bookings/${encodeURIComponent(id)}`, undefined, validBookingId(id));
  const profile = useCustomerRead<CustomerProfile>(`/customer/${encodeURIComponent(session.slug)}/profile`);
  const businesses = useCustomerRead<{ businesses: CustomerBusiness[] }>('/customer/businesses');
  const canBook = businesses.data?.businesses.some(item => item.slug === session.slug && item.canBook) === true;
  const catalog = usePublicBookingData(session.slug, visit);
  const [stage, setStage] = useState<'service' | 'professional' | 'datetime' | 'review'>('service');
  const [serviceId, setService] = useState('');
  const [professionalId, setProfessional] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<PublicAvailabilitySlot | null>(null);
  const [optedIn, setOptedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [expired, setExpired] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CustomerDetail | null>(null);
  const [failure, setFailure] = useState<{ error: unknown; at: number } | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const lock = useRef(false);
  const command = useRef<CustomerCommand<BookingInput> | null>(null);
  const heading = useRef<HTMLDivElement>(null);
  const readError = detail.error ?? profile.error ?? businesses.error ?? catalog.error;
  const error = failure?.error ?? readError;
  const wait = usePublicReadWait(error, failure?.at ?? Math.max(detail.errorUpdatedAt, profile.errorUpdatedAt, catalog.errorUpdatedAt));
  const clearSlot = useCallback(() => setSlot(null), []);
  const changeDate = useCallback((value: string) => { setDate(value); setSlot(null); }, []);
  const retire = useCallback(() => setUnavailable(true), []);
  const refetchDetail = detail.refetch, refetchProfile = profile.refetch, refetchCatalog = catalog.refetch, refetchBusinesses = businesses.refetch;
  const refresh = useCallback(() => { if (!wait && !lock.current) { void refetchDetail(); void refetchProfile(); void refetchCatalog(); void refetchBusinesses(); } }, [wait, refetchDetail, refetchProfile, refetchCatalog, refetchBusinesses]);
  useCustomerRevalidation(refresh, wait === 0);
  useEffect(() => { heading.current?.querySelector<HTMLElement>('[tabindex="-1"]')?.focus(); }, [stage]);
  useEffect(() => {
    if (initialized || !detail.data || !catalog.data) return;
    const previous = detail.data;
    const frame = requestAnimationFrame(() => {
      const service = catalog.data!.services.find(item => item.id === previous.service.id);
      const professional = catalog.data!.professionals.find(item => item.id === previous.professional.id);
      if (service) setService(service.id);
      if (professional) setProfessional(professional.id);
      if (!service || !professional) setMessage('Esta opción ya no está disponible. Elige otra para continuar.');
      setInitialized(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [initialized, detail.data, catalog.data]);
  async function register() {
    if (lock.current || wait > 0 || expired || !slot || !profile.data?.canEditContact || !canBook) return;
    if (!command.current) command.current = { key: crypto.randomUUID(), body: { serviceId, professionalId: slot.professionalId, startTime: slot.startTime, ...(optedIn ? { emailNotifications: { optedIn: true, noticeVersion: EMAIL_NOTICE_VERSION } } : {}) }, createdAt: Date.now() };
    if (!commandCanRetry(command.current)) { setExpired(true); setMessage('El plazo para comprobar este envío terminó. Revisa Mis reservas o contacta al negocio antes de registrar otra cita.'); return; }
    lock.current = true; setBusy(true); setMessage(null);
    try {
      const response = await api.post<{ booking: CustomerDetail }>(`/customer/${encodeURIComponent(session.slug)}/bookings`, command.current.body, { ...session.options(), headers: { 'Idempotency-Key': command.current.key } });
      if (!session.active()) return;
      setResult(response.booking); command.current = null; setUncertain(false); setFailure(null);
    } catch (error) {
      if (!session.active()) return;
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) session.reject();
      else {
        const unknown = uncertainCustomerWrite(error); setUncertain(unknown); setFailure({ error, at: Date.now() }); setMessage(customerError(error, 'booking'));
        if (!unknown) { command.current = null; if (!(error instanceof ApiError && error.status === 429)) { setSlot(null); setStage('datetime'); } }
      }
    } finally { lock.current = false; if (session.active()) setBusy(false); }
  }
  if (!validBookingId(id)) return <><p>Esta reserva no está disponible para tu cuenta.</p><Link href={routes.bookings}>Volver a Mis reservas</Link></>;
  if (result) return <><h2>Tu reserva quedó registrada</h2><p role="status">{customerStatus[result.status]}</p><BusinessTime value={result.startTime} zone={result.business.timeZone} /><p>{result.service.name} · {result.professional.name}</p><Link href={`${routes.bookings}/${result.id}`}>Ver reserva</Link><Link href={routes.bookings}>Volver a Mis reservas</Link></>;
  if (detail.isLoading || profile.isLoading || businesses.isLoading || catalog.isLoading || detail.isFetching || profile.isFetching || businesses.isFetching || catalog.isFetching) return <p role="status">Cargando opciones para tu nueva cita…</p>;
  if (readError) return <><p role="alert">{customerError(readError)}</p>{wait > 0 && <p>Puedes volver a consultar en {wait} segundos.</p>}<Button disabled={wait > 0} onClick={refresh}>Reintentar</Button></>;
  if (unavailable || !canBook || !profile.data?.canEditContact || !catalog.data || !detail.data) return <><p>Este negocio no acepta otra reserva desde tu cuenta ahora. Contacta al negocio para continuar.</p><Link href={routes.bookings}>Volver a Mis reservas</Link></>;
  const data = catalog.data;
  const service = data.services.find(item => item.id === serviceId);
  const professional = data.professionals.find(item => item.id === slot?.professionalId);
  return <div className="booking-flow" ref={heading}>
    <p className="mb-4">Elige un nuevo horario. Revisa el precio y los datos antes de reservar.</p>
    {message && <p role="alert" className="mb-4">{message}</p>}
    {wait > 0 && <p role="status">Puedes volver a probar en {wait} segundos.</p>}
    {uncertain || expired ? <div className="customer-stack"><p>Conservamos este envío durante la visita para comprobar su resultado.</p>{!expired && <Button aria-busy={busy} disabled={busy || wait > 0} onClick={() => void register()}>{busy ? 'Comprobando tu reserva…' : 'Reintentar el mismo envío'}</Button>}<Link href={routes.bookings}>Revisar Mis reservas</Link><Link href={routes.root}>Contactar al negocio</Link></div> : <>
      {stage === 'service' && <ServiceStep services={data.services} serviceId={serviceId} onSelect={value => { setService(value); setSlot(null); }} onNext={() => setStage('professional')} />}
      {stage === 'professional' && <ProfessionalStep professionals={data.professionals} professionalId={professionalId} onSelect={value => { setProfessional(value); setSlot(null); }} onBack={() => setStage('service')} onNext={() => setStage('datetime')} />}
      {stage === 'datetime' && <DateTimeStep slug={session.slug} visit={visit} serviceId={serviceId} professionalId={professionalId ?? ''} minimumBookingDate={data.minimumBookingDate} date={date} selectedStartTime={slot?.startTime} selectedProfessionalId={slot?.professionalId} professionalName={professional?.name} onDateChange={changeDate} onSlotSelect={setSlot} onClearSlot={clearSlot} onUnavailable={retire} onBack={() => setStage('professional')} onNext={() => setStage('review')} />}
      {stage === 'review' && slot && <section className="customer-stack"><h2 tabIndex={-1}>Revisa tu nueva reserva</h2><BusinessTime value={slot.startTime} zone={data.timeZone} /><p>{service?.name} · {service ? formatMoney(service.price) : ''}</p><p>Te atenderá {professional?.name}</p><div className="customer-card"><h2>Datos para este negocio</h2><p>{profile.data.name}</p><p>{profile.data.phone}</p><p>{profile.data.email}</p><Link href={routes.profile}>Editar mis datos</Link></div>
        {profile.data.email && <EmailConsent tone="dark" checked={optedIn} onChange={setOptedIn} />}
        <p>La reserva quedará pendiente de confirmación del negocio.</p><nav><Button variant="ghost" disabled={busy} onClick={() => { command.current = null; setStage('datetime'); }}>Atrás</Button><Button aria-busy={busy} disabled={busy || wait > 0} onClick={() => void register()}>{busy ? 'Registrando tu reserva…' : 'Registrar reserva'}</Button></nav>
      </section>}
    </>}
  </div>;
}
