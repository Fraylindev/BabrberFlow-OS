"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, PublicAvailabilitySlot, PublicBookingResult } from "@/lib/api";
import { useCreatePublicBooking, usePublicBookingData } from "@/lib/queries/public-booking";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BookingHeader } from "@/app/[slug]/_components/BookingHeader";
import { ANY_PROFESSIONAL } from "@/app/[slug]/_components/ProfessionalStep";
import { Step, StepRouter } from "@/app/[slug]/_components/StepRouter";
import { SuccessView } from "@/app/[slug]/_components/SuccessView";
import { EMAIL_NOTICE_VERSION } from '@/lib/notification-ui';

const STEP_ORDER: Step[] = ["service", "professional", "datetime", "contact", "account", "confirm"];

export function PublicMiniSite({ slug }: { slug: string }) {
  const { data, error, isLoading, isError, isFetching, refetch } = usePublicBookingData(slug);
  const createBooking = useCreatePublicBooking(slug);
  const bookingHeading = useRef<HTMLHeadingElement>(null);

  const [bookingStarted, setBookingStarted] = useState(false);
  const [publicUnavailable, setPublicUnavailable] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [resolvedProfessionalId, setResolvedProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [emailOptedIn, setEmailOptedIn] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicBookingResult | null>(null);

  useEffect(() => {
    if (!bookingStarted) return;
    const frame = window.requestAnimationFrame(() => {
      bookingHeading.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      bookingHeading.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [bookingStarted]);

  const isRetired = publicUnavailable || (isError && error instanceof ApiError && error.status === 404);

  if (isLoading) return <PublicLoading />;
  if (isRetired || !data) {
    if (isError && !(error instanceof ApiError && error.status === 404)) {
      return <PublicLoadError onRetry={() => void refetch()} pending={isFetching} />;
    }
    return <PublicUnavailable />;
  }
  if (isError) return <PublicLoadError onRetry={() => void refetch()} pending={isFetching} />;

  const canBook = data.services.length > 0 && data.professionals.length > 0;
  const selectedService = data.services.find((service) => service.id === serviceId);
  const selectedProfessional = data.professionals.find(
    (professional) => professional.id === resolvedProfessionalId,
  );
  const professionalLabel =
    professionalId === ANY_PROFESSIONAL && !selectedProfessional
      ? "Cualquiera disponible"
      : selectedProfessional?.name;

  async function handleStartBooking() {
    setStartError(null);
    const refreshed = await refetch();
    if (refreshed.error) {
      if (refreshed.error instanceof ApiError && refreshed.error.status === 404) {
        setPublicUnavailable(true);
      } else {
        setStartError("No pudimos comprobar las reservas. Revisa tu conexión e inténtalo de nuevo.");
      }
      return;
    }
    if (!refreshed.data?.services.length || !refreshed.data.professionals.length) {
      setStartError("Las reservas en línea no están disponibles por ahora.");
      return;
    }
    setBookingStarted(true);
  }

  function handleSlotSelect(slot: PublicAvailabilitySlot) {
    setTime(slot.time);
    setResolvedProfessionalId(slot.professionalId);
    setSelectedStartTime(slot.startTime);
  }

  async function handleConfirm() {
    setSubmitError(null);
    if (!selectedStartTime) {
      setSubmitError("Vuelve al paso de fecha y elige un horario antes de confirmar.");
      return;
    }
    try {
      const response = await createBooking.mutateAsync({
        serviceId,
        professionalId: resolvedProfessionalId,
        startTime: selectedStartTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        ...(emailOptedIn ? { emailNotifications: { optedIn: true, noticeVersion: EMAIL_NOTICE_VERSION } } : {}),
        createAccount,
        password: createAccount ? password : undefined,
      });
      setResult(response);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setPublicUnavailable(true);
        return;
      }
      setSubmitError(
        caught instanceof ApiError
          ? caught.message
          : "No se pudo confirmar la reserva. Inténtalo de nuevo.",
      );
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--color-ink)]">
      <section className="film-grain border-b border-[var(--color-border)]">
        <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between">
            <Brand compact />
            <span className="font-[family-name:var(--font-mono)] text-[0.68rem] uppercase tracking-[0.2em] text-[var(--color-faint)]">
              Reservas en línea
            </span>
          </div>

          <div className="my-auto max-w-3xl py-16 sm:py-24">
            <p className="mb-5 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.24em] text-[var(--color-brass)]">
              Bienvenido
            </p>
            <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[0.98] text-[var(--color-paper)] sm:text-7xl lg:text-8xl">
              {data.organization.name}
            </h1>
            {data.organization.description && (
              <p className="mt-7 max-w-2xl whitespace-pre-line text-base leading-7 text-[var(--color-muted)] sm:text-lg">
                {data.organization.description}
              </p>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-3">
              {canBook && (
                <Button
                  className="min-h-12 px-6"
                  onClick={() => void handleStartBooking()}
                  disabled={isFetching}
                  aria-describedby={startError ? "public-booking-start-error" : undefined}
                >
                  {isFetching ? "Comprobando disponibilidad…" : "Reservar cita"}
                </Button>
              )}
              {data.organization.phone && (
                <a
                  className="inline-flex min-h-12 items-center border border-[var(--color-border-strong)] px-5 text-sm text-[var(--color-paper)] transition-colors hover:border-[var(--color-brass)]"
                  href={`tel:${data.organization.phone}`}
                >
                  Llamar al {data.organization.phone}
                </a>
              )}
            </div>

            {!canBook && (
              <p className="mt-5 text-sm text-[var(--color-muted)]" role="status">
                Las reservas en línea no están disponibles por ahora.
              </p>
            )}
            {startError && (
              <p
                id="public-booking-start-error"
                className="mt-5 text-sm text-[var(--color-danger)]"
                role="alert"
              >
                {startError}
              </p>
            )}
          </div>
        </div>
      </section>

      {(data.organization.address || data.organization.googleMapsUrl) && (
        <section className="border-b border-[var(--color-border)]" aria-labelledby="location-title">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-center lg:px-12">
            <div>
              <p className="font-[family-name:var(--font-mono)] text-[0.68rem] uppercase tracking-[0.2em] text-[var(--color-faint)]">
                Visítanos
              </p>
              <h2
                id="location-title"
                className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]"
              >
                Nuestra ubicación
              </h2>
              {data.organization.address && (
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--color-muted)]">
                  {data.organization.address}
                </p>
              )}
            </div>
            {data.organization.googleMapsUrl && (
              <a
                href={data.organization.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center border border-[var(--color-border-strong)] px-5 text-sm text-[var(--color-paper)] transition-colors hover:border-[var(--color-brass)]"
              >
                Abrir en Google Maps
              </a>
            )}
          </div>
        </section>
      )}

      {bookingStarted && (
        <section
          id="reservar"
          className="mx-auto flex max-w-2xl flex-col px-4 py-14 sm:px-8 sm:py-20"
          aria-labelledby="booking-title"
        >
          <BookingHeader
            headingRef={bookingHeading}
            organizationName={data.organization.name}
            showBrand={false}
            showProgress={!result}
            progressRatio={(STEP_ORDER.indexOf(step) + 1) / STEP_ORDER.length}
          />

          <Card className="p-5 sm:p-7">
            {result ? (
              <SuccessView
                result={result}
                organizationPhone={data.organization.phone}
                serviceName={selectedService?.name}
                professionalName={professionalLabel}
                date={date}
                time={time}
              />
            ) : (
              <StepRouter
                step={step}
                setStep={setStep}
                slug={slug}
                data={data}
                serviceId={serviceId}
                setServiceId={(nextServiceId) => {
                  if (nextServiceId === serviceId) return;
                  setServiceId(nextServiceId);
                  setProfessionalId(null);
                  setResolvedProfessionalId("");
                  setDate("");
                  setTime("");
                  setSelectedStartTime("");
                }}
                professionalId={professionalId}
                setProfessionalId={(nextProfessionalId) => {
                  if (nextProfessionalId === professionalId) return;
                  setProfessionalId(nextProfessionalId);
                  setResolvedProfessionalId("");
                  setDate("");
                  setTime("");
                  setSelectedStartTime("");
                }}
                date={date}
                time={time}
                onDateChange={(nextDate) => {
                  setDate(nextDate);
                  setTime("");
                  setResolvedProfessionalId("");
                  setSelectedStartTime("");
                }}
                onSlotSelect={handleSlotSelect}
                clientName={clientName}
                setClientName={setClientName}
                clientPhone={clientPhone}
                setClientPhone={setClientPhone}
                clientEmail={clientEmail}
                setClientEmail={(email) => { setClientEmail(email); setEmailOptedIn(false); }}
                emailOptedIn={emailOptedIn}
                setEmailOptedIn={setEmailOptedIn}
                createAccount={createAccount}
                setCreateAccount={setCreateAccount}
                password={password}
                setPassword={setPassword}
                serviceName={selectedService?.name}
                professionalLabel={professionalLabel}
                submitError={submitError}
                submitting={createBooking.isPending}
                onConfirm={handleConfirm}
              />
            )}
          </Card>
        </section>
      )}

      <footer className="border-t border-[var(--color-border)] px-5 py-7 text-center text-xs text-[var(--color-faint)]">
        Reservas gestionadas con Kortek Booking
      </footer>
    </main>
  );
}

function PublicLoading() {
  return (
    <main
      className="mx-auto flex min-h-screen max-w-6xl animate-pulse flex-col px-5 py-8 sm:px-8 lg:px-12"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Cargando página del negocio…</span>
      <div className="h-6 w-32 bg-[var(--color-surface-raised)]" />
      <div className="my-auto space-y-5 py-16">
        <div className="h-4 w-24 bg-[var(--color-surface-raised)]" />
        <div className="h-16 w-full max-w-2xl bg-[var(--color-surface-raised)]" />
        <div className="h-5 w-full max-w-xl bg-[var(--color-surface-raised)]" />
        <div className="h-12 w-40 bg-[var(--color-surface-raised)]" />
      </div>
    </main>
  );
}

function PublicUnavailable() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <Brand />
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
        Esta página no está disponible
      </h1>
      <p className="max-w-sm text-sm leading-6 text-[var(--color-muted)]">
        Revisa el enlace o comunícate directamente con el negocio.
      </p>
    </main>
  );
}

function PublicLoadError({ onRetry, pending }: { onRetry: () => void; pending: boolean }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <Brand />
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
        No pudimos cargar esta página
      </h1>
      <p className="max-w-sm text-sm leading-6 text-[var(--color-muted)]">
        Revisa tu conexión e inténtalo de nuevo.
      </p>
      <Button onClick={onRetry} disabled={pending}>
        {pending ? "Reintentando…" : "Reintentar"}
      </Button>
    </main>
  );
}
