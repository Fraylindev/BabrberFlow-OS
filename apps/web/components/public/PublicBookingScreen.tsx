'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError, type PublicAvailabilityResponse, type PublicAvailabilitySlot, type PublicBookingResult } from '@/lib/api';
import { useCreatePublicBooking, usePublicBookingData } from '@/lib/queries/public-booking';
import { usePublicMedia } from '@/lib/queries/media';
import { isPublicMedia } from '@/lib/media-ui';
import { bookingFailure, contactErrors, type ContactDraft } from '@/lib/public-booking-ui';
import { EMAIL_NOTICE_VERSION } from '@/lib/notification-ui';
import { businessDate } from '@/lib/business-time';
import { usePublicReadWait } from '@/lib/use-public-read-wait';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/ErrorText';
import { ServiceStep } from '@/app/[slug]/_components/ServiceStep';
import { ProfessionalStep } from '@/app/[slug]/_components/ProfessionalStep';
import { DateTimeStep } from '@/app/[slug]/_components/DateTimeStep';
import { ContactStep } from '@/app/[slug]/_components/ContactStep';
import { ConfirmStep } from '@/app/[slug]/_components/ConfirmStep';
import { SuccessView } from '@/app/[slug]/_components/SuccessView';
import './booking.css';
import { EMPTY_PHONE, type PhoneDraft } from '@/lib/public-phone';

const STEPS = ['service', 'professional', 'datetime', 'contact', 'confirm'] as const;
type Step = typeof STEPS[number];
const LABELS = ['Servicio', 'Profesional', 'Fecha y hora', 'Tus datos', 'Revisar'];
const emptyContact: ContactDraft = { clientName: '', clientPhone: '', clientEmail: '', password: '', createAccount: false, emailOptedIn: false };

export function PublicBookingScreen({ slug }: { slug: string }) {
  const { user, organization } = useAuth();
  const scope = JSON.stringify([slug, user?.id, user?.role, organization?.id]);
  return <PublicBookingFlow key={scope} slug={slug} />;
}

export function PublicBookingFlow({ slug }: { slug: string }) {
  const visit = useId();
  const [controller] = useState(() => new AbortController());
  const query = usePublicBookingData(slug, visit);
  const data = query.data;
  const dataLoaded = Boolean(data);
  const refetchData = query.refetch;
  const mediaQuery = usePublicMedia(slug, Boolean(data), visit);
  const dataWait = usePublicReadWait(query.error, query.errorUpdatedAt);
  const mediaWait = usePublicReadWait(mediaQuery.error, mediaQuery.errorUpdatedAt);
  const createBooking = useCreatePublicBooking(slug, controller.signal);
  const media = !mediaQuery.isError && isPublicMedia(mediaQuery.data) ? mediaQuery.data : null;
  const [step, setStep] = useState<Step>('service');
  const [serviceId, setService] = useState('');
  const [professionalId, setProfessional] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<PublicAvailabilitySlot | null>(null);
  const [contact, setContact] = useState(emptyContact);
  const [phone, setPhone] = useState<PhoneDraft>(EMPTY_PHONE);
  const [result, setResult] = useState<PublicBookingResult | null>(null);
  const [retired, setRetired] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retryUntil, setRetryUntil] = useState(0);
  const [clock, setClock] = useState(0);
  const live = useRef(false);
  const locked = useRef(false);
  const returnHref = `/${encodeURIComponent(slug)}`;
  const unavailable = retired || [query.error, mediaQuery.error].some(error => error instanceof ApiError && error.status === 404);
  const retire = useCallback(() => { setRetired(true); setContact(emptyContact); setPhone(EMPTY_PHONE); setSlot(null); }, []);
  const clearSlot = useCallback(() => setSlot(null), []);
  const changeDate = useCallback((next: string) => { setDate(next); setSlot(null); }, []);

  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const heading = document.getElementById(unavailable ? 'booking-unavailable-title' : result ? 'booking-success-title' : uncertain ? 'booking-uncertain-title' : 'booking-step-title');
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [step, result, uncertain, unavailable, dataLoaded]);
  useEffect(() => {
    if (!data || result || uncertain || unavailable) return;
    let requestedDate = data.minimumBookingDate;
    const timer = setInterval(() => {
      const today = businessDate(new Date(), data.timeZone);
      if (today > requestedDate) { requestedDate = today; void refetchData(); }
    }, 60_000);
    return () => clearInterval(timer);
  }, [data, result, uncertain, unavailable, refetchData]);
  useEffect(() => {
    if (!retryUntil) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryUntil]);

  // Revalidar catálogo y fecha mínima sin sustituir un profesional aceptado.
  useEffect(() => {
    if (!data || result || busy) return;
    const frame = requestAnimationFrame(() => {
    if (serviceId && !data.services.some(item => item.id === serviceId)) {
      setService(''); setProfessional(null); setSlot(null); setDate(''); setStep('service');
      setMessage('El servicio ya no está disponible. Elige otro servicio.');
    } else if (professionalId && !data.professionals.some(item => item.id === professionalId)) {
      setProfessional(null); setSlot(null); setDate(''); setStep('professional');
      setMessage('El profesional ya no está disponible. Elige otro profesional.');
    } else if (date && date < data.minimumBookingDate) {
      setSlot(null); setDate(''); setStep('datetime'); setMessage('Esa fecha ya pasó en el horario del negocio. Elige otra fecha.');
    }
    });
    return () => cancelAnimationFrame(frame);
  }, [data, result, busy, serviceId, professionalId, date]);

  const selection = useRef({ slot, serviceId, professionalId, date, step, result });
  useEffect(() => { selection.current = { slot, serviceId, professionalId, date, step, result }; }, [slot, serviceId, professionalId, date, step, result]);
  useEffect(() => {
    async function checkOnReturn() {
      const current = selection.current;
      if (document.visibilityState === 'hidden' || locked.current || current.result || !current.slot || current.step === 'datetime') return;
      try {
        const search = new URLSearchParams({ serviceId: current.serviceId, date: current.date });
        if (current.professionalId) search.set('professionalId', current.professionalId);
        const response = await api.get<PublicAvailabilityResponse>(`/public/${encodeURIComponent(slug)}/availability?${search}`, undefined, { signal: controller.signal, cache: 'no-store' });
        if (!live.current || selection.current.slot !== current.slot || locked.current) return;
        if (!response.slots.some(item => item.startTime === current.slot?.startTime && item.professionalId === current.slot.professionalId)) {
          setSlot(null); setStep('datetime'); setMessage('Ese horario ya no está disponible. Elige otra hora.');
        }
      } catch (error) {
        if (!live.current) return;
        if (error instanceof ApiError && error.status === 404) retire();
        else setMessage('No pudimos comprobar el horario. Lo revisaremos antes de registrar la reserva.');
      }
    }
    window.addEventListener('focus', checkOnReturn);
    document.addEventListener('visibilitychange', checkOnReturn);
    if (step === 'confirm') void checkOnReturn();
    return () => { window.removeEventListener('focus', checkOnReturn); document.removeEventListener('visibilitychange', checkOnReturn); };
  }, [slug, controller, retire, step]);

  function changeService(next: string) {
    if (next === serviceId) return;
    setService(next); setProfessional(null); setDate(''); setSlot(null); setMessage(null);
  }
  function changeProfessional(next: string) {
    if (next === professionalId) return;
    setProfessional(next); setDate(''); setSlot(null); setMessage(null);
  }
  async function register() {
    if (locked.current || uncertain || unavailable || !slot || retryUntil > Date.now()) return;
    if (Object.keys(contactErrors(contact)).length) { setStep('contact'); return; }
    locked.current = true; setBusy(true); setMessage(null);
    let posted = false;
    try {
      const refreshed = await query.refetch();
      if (!live.current) return;
      if (refreshed.error) throw refreshed.error;
      if (!refreshed.data?.services.some(item => item.id === serviceId) || !refreshed.data.professionals.some(item => item.id === slot.professionalId)) {
        setSlot(null); setStep('service'); setMessage('La selección cambió. Revisa el servicio y el profesional.'); return;
      }
      const search = new URLSearchParams({ serviceId, date, professionalId: slot.professionalId });
      const available = await api.get<PublicAvailabilityResponse>(`/public/${encodeURIComponent(slug)}/availability?${search}`, undefined, { signal: controller.signal, cache: 'no-store' });
      if (!live.current) return;
      if (!available.slots.some(item => item.startTime === slot.startTime && item.professionalId === slot.professionalId)) {
        setSlot(null); setStep('datetime'); setMessage('Ese horario ya no está disponible. Elige otra hora.'); return;
      }
      posted = true;
      const response = await createBooking.mutateAsync({ serviceId, professionalId: slot.professionalId, startTime: slot.startTime,
        clientName: contact.clientName.trim(), clientPhone: contact.clientPhone.trim(), clientEmail: contact.clientEmail.trim() || undefined,
        ...(contact.emailOptedIn ? { emailNotifications: { optedIn: true, noticeVersion: EMAIL_NOTICE_VERSION } } : {}),
        createAccount: contact.createAccount, ...(contact.createAccount ? { password: contact.password } : {}),
      });
      if (!live.current) return;
      setResult(response); setContact(emptyContact); setPhone(EMPTY_PHONE); createBooking.reset();
    } catch (error) {
      if (!live.current) return;
      const failure = bookingFailure(error);
      if (failure.kind === 'retired') retire();
      else if (!posted) setMessage(error instanceof ApiError ? error.withRequestCode('No pudimos comprobar la disponibilidad. Revisa tu conexión e inténtalo de nuevo.') : 'No pudimos comprobar la disponibilidad. Revisa tu conexión e inténtalo de nuevo.');
      else {
        setMessage(failure.message);
        if (failure.kind === 'contact') setStep('contact');
        if (failure.kind === 'slot') { setSlot(null); setStep('datetime'); }
        if (failure.kind === 'uncertain') { setUncertain(true); setContact(emptyContact); setPhone(EMPTY_PHONE); }
      }
      if (error instanceof ApiError && error.status === 429) {
        setRetryUntil(Date.now() + Math.max(1, error.retryAfterSeconds ?? 60) * 1000); setClock(Date.now());
      }
      createBooking.reset();
    } finally {
      locked.current = false;
      if (live.current) setBusy(false);
    }
  }

  const service = data?.services.find(item => item.id === (result?.booking.serviceId ?? serviceId));
  const professional = data?.professionals.find(item => item.id === (result?.booking.professionalId ?? slot?.professionalId));
  const servicePhoto = media?.services.find(item => item.serviceId === service?.id)?.image;
  const professionalPhoto = media?.professionals.find(item => item.professionalId === professional?.id)?.avatar;
  const updateContact = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) => setContact(old => ({ ...old, [key]: value }));
  const remaining = Math.max(0, Math.ceil((retryUntil - clock) / 1000));

  return <main className="booking-flow mx-auto max-w-[640px] px-4 pt-3 sm:px-6 sm:pt-6">
    {!result && <Link href={returnHref} className="inline-flex items-center text-sm text-[var(--color-muted)]">← Volver al negocio</Link>}
    <header className="pb-5 pt-2"><h1 id={unavailable ? 'booking-unavailable-title' : undefined} tabIndex={unavailable ? -1 : undefined} className="font-[family-name:var(--font-display)] text-2xl">{unavailable ? 'Esta página no está disponible' : data?.organization.name ?? 'Reserva tu cita'}</h1></header>
    {unavailable ? <div className="px-3"><p>{result ? 'Tu reserva quedó registrada. La página del negocio ya no está disponible; esto no cancela tu reserva.' : 'Revisa el enlace o comunícate directamente con el negocio.'}</p></div>
      : query.isLoading ? <div role="status" aria-busy="true" className="min-h-64 space-y-4 px-3"><p>Cargando opciones…</p><div aria-hidden="true" className="space-y-3">{[1, 2, 3].map(item => <div key={item} className="h-14 border border-[var(--color-border)] bg-[var(--color-surface)]" />)}</div></div>
      : !data ? <div className="space-y-3 px-3" role="alert"><p>No pudimos cargar esta página. Revisa tu conexión e inténtalo de nuevo.</p>{dataWait > 0 && <p>Puedes volver a consultar en {dataWait} segundos.</p>}<Button disabled={query.isFetching || dataWait > 0} onClick={() => void query.refetch()}>Reintentar</Button></div>
      : uncertain ? <div className="space-y-4 px-3"><h2 id="booking-uncertain-title" tabIndex={-1} className="text-2xl">No pudimos comprobar el resultado</h2><p role="alert">{message}</p><Link href={returnHref} className="inline-flex items-center border px-4">Volver a la página del negocio</Link></div>
      : result ? <div className="booking-step"><SuccessView result={result} organizationPhone={data.organization.phone} organizationName={data.organization.name}
        address={data.organization.address} mapsUrl={data.organization.googleMapsUrl} returnHref={returnHref}
        serviceName={service?.name} price={service?.price} professionalName={professional?.name} timeZone={data.timeZone} servicePhoto={servicePhoto} professionalPhoto={professionalPhoto} /></div>
      : !data.services.length || !data.professionals.length ? <p role="status" className="px-3">{!data.services.length ? 'Este negocio no tiene servicios disponibles para reservar en línea.' : 'No hay profesionales disponibles por ahora.'}</p>
      : <>
        <nav aria-label="Progreso de la reserva" className="pb-4"><p className="text-sm text-[var(--color-muted)]">Paso {STEPS.indexOf(step) + 1} de 5 · {LABELS[STEPS.indexOf(step)]}</p>
          <ol className="mt-3 flex gap-2" aria-label="Pasos">{STEPS.map((item, index) => <li key={item} aria-current={item === step ? 'step' : undefined} className={`h-1 flex-1 ${index <= STEPS.indexOf(step) ? 'bg-[var(--color-brass)]' : 'bg-[var(--color-border)]'}`}><span className="sr-only">{LABELS[index]}</span></li>)}</ol>
          {data.professionals.length === 1 && professionalId && <p className="mt-2 text-sm text-[var(--color-muted)]">Profesional seleccionado: {data.professionals[0].name}</p>}
        </nav>
        {message && <div role="alert" className="mx-3 mb-4 text-[var(--color-danger)]"><ErrorText message={message} tone="dark" /></div>}
        {mediaQuery.isError && <div className="mx-3 mb-4 text-sm"><p>Las fotos no están disponibles ahora.</p>{mediaWait > 0 && <p>Puedes volver a consultar en {mediaWait} segundos.</p>}<Button variant="secondary" disabled={mediaQuery.isFetching || mediaWait > 0} onClick={() => void mediaQuery.refetch()}>Reintentar fotos</Button></div>}
        <div className="booking-step">
          {step === 'service' && <ServiceStep services={data.services} serviceId={serviceId} onSelect={changeService} media={media} onNext={() => {
            if (data.professionals.length === 1) { setProfessional(data.professionals[0].id); setStep('datetime'); } else setStep('professional');
          }} />}
          {step === 'professional' && <ProfessionalStep professionals={data.professionals} professionalId={professionalId} onSelect={changeProfessional} media={media} onBack={() => setStep('service')} onNext={() => setStep('datetime')} />}
          {step === 'datetime' && <DateTimeStep key={`${serviceId}-${professionalId}`} slug={slug} visit={visit} serviceId={serviceId} professionalId={professionalId ?? ''}
            minimumBookingDate={data.minimumBookingDate} date={date} selectedStartTime={slot?.startTime ?? ''} selectedProfessionalId={slot?.professionalId} onDateChange={changeDate} onSlotSelect={selected => {
              if (!data.professionals.some(item => item.id === selected.professionalId)) {
                setSlot(null); setStep('professional'); setMessage('Las opciones cambiaron. Vuelve a elegir profesional.'); void refetchData();
              } else setSlot(selected);
            }}
            onClearSlot={clearSlot} onUnavailable={retire} professionalName={professional?.name} onBack={() => setStep(data.professionals.length === 1 ? 'service' : 'professional')} onNext={() => setStep('contact')} />}
          {step === 'contact' && <ContactStep {...contact} phone={phone} onPhoneDraftChange={setPhone} onNameChange={value => updateContact('clientName', value)} onPhoneChange={value => updateContact('clientPhone', value)}
            onEmailChange={value => setContact(old => ({ ...old, clientEmail: value, emailOptedIn: false }))} onEmailOptInChange={value => updateContact('emailOptedIn', value)}
            onAccountChange={value => setContact(old => ({ ...old, createAccount: value, password: value ? old.password : '' }))} onPasswordChange={value => updateContact('password', value)}
            onBack={() => setStep('datetime')} onNext={() => { setMessage(null); setStep(slot ? 'confirm' : 'datetime'); }} />}
          {step === 'confirm' && slot && <ConfirmStep {...contact} serviceName={service?.name} professionalName={professional?.name} startTime={slot.startTime} timeZone={data.timeZone}
            servicePhoto={servicePhoto} professionalPhoto={professionalPhoto} duration={service?.duration} price={service?.price} address={data.organization.address} submitError={null}
            submitting={busy} waiting={remaining > 0} onBack={() => setStep('contact')} onEdit={setStep} onConfirm={() => void register()} />}
          {remaining > 0 && <p role="status" className="mt-3">Puedes continuar en {remaining} segundos.</p>}
        </div>
      </>}
    <footer className="mt-10 px-3 text-sm text-[var(--color-muted)]">Reservas gestionadas con Kortek Booking</footer>
  </main>;
}
