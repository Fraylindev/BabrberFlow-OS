"use client";

import { useState, use as usePromise } from "react";
import { Card } from "@/components/ui/Card";
import { Brand } from "@/components/Brand";
import { ApiError, PublicAvailabilitySlot, PublicBookingResult } from "@/lib/api";
import { usePublicBookingData, useCreatePublicBooking } from "@/lib/queries/public-booking";
import { BookingHeader } from "./_components/BookingHeader";
import { StepRouter, Step } from "./_components/StepRouter";
import { SuccessView } from "./_components/SuccessView";
import { ANY_PROFESSIONAL } from "./_components/ProfessionalStep";
import { waLink } from "./_components/shared";

const STEP_ORDER: Step[] = ["service", "professional", "datetime", "contact", "account", "confirm"];

export default function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = usePromise(params);
  const { data, isLoading, isError } = usePublicBookingData(slug);
  const createBooking = useCreatePublicBooking(slug);

  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [resolvedProfessionalId, setResolvedProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicBookingResult | null>(null);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-[var(--color-muted)]">
        Cargando…
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <Brand />
        <p className="text-sm text-[var(--color-muted)]">
          No encontramos ninguna barbería con ese enlace.
        </p>
      </main>
    );
  }

  const selectedService = data.services.find((s) => s.id === serviceId);
  const selectedProfessional = data.professionals.find((p) => p.id === resolvedProfessionalId);
  const professionalLabel =
    professionalId === ANY_PROFESSIONAL && !selectedProfessional
      ? "Cualquiera disponible"
      : selectedProfessional?.name;

  function handleSlotSelect(slot: PublicAvailabilitySlot) {
    setTime(slot.time);
    setResolvedProfessionalId(slot.professionalId);
  }

  async function handleConfirm() {
    if (!data) return;
    setSubmitError(null);
    try {
      const startTime = new Date(`${date}T${time}:00`).toISOString();
      const res = await createBooking.mutateAsync({
        serviceId,
        professionalId: resolvedProfessionalId,
        startTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        createAccount,
        password: createAccount ? password : undefined,
      });
      setResult(res);

      const message = `Hola, ${clientName.trim()}! Tu cita en ${data.organization.name} para ${selectedService?.name} quedó registrada para el ${date} a las ${time}.`;
      const link = waLink(data.organization.phone, message);
      if (link) window.open(link, "_blank");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "No se pudo confirmar la reserva.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-10">
      <BookingHeader
        organizationName={data.organization.name}
        showProgress={!result}
        progressRatio={(STEP_ORDER.indexOf(step) + 1) / STEP_ORDER.length}
      />

      <Card className="p-6">
        {result ? (
          <SuccessView
            result={result}
            organizationName={data.organization.name}
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
            setServiceId={setServiceId}
            professionalId={professionalId}
            setProfessionalId={setProfessionalId}
            date={date}
            time={time}
            onDateChange={(d) => {
              setDate(d);
              setTime("");
            }}
            onSlotSelect={handleSlotSelect}
            clientName={clientName}
            setClientName={setClientName}
            clientPhone={clientPhone}
            setClientPhone={setClientPhone}
            clientEmail={clientEmail}
            setClientEmail={setClientEmail}
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
    </main>
  );
}
