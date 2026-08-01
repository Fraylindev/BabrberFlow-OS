"use client";

import { useEffect, useState, use as usePromise } from "react";
import { api, ApiError, PublicBookingData, PublicBookingResult } from "@/lib/api";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InputField } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";

type Step =
  | "loading"
  | "not-found"
  | "service"
  | "professional"
  | "datetime"
  | "contact"
  | "account"
  | "confirm"
  | "submitting"
  | "success";

function formatMoney(value: string | number) {
  return `RD$${Number(value).toLocaleString("es-DO", { minimumFractionDigits: 0 })}`;
}

function waLink(phone: string | null, message: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = usePromise(params);

  const [step, setStep] = useState<Step>("loading");
  const [data, setData] = useState<PublicBookingData | null>(null);

  // Selecciones del wizard
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicBookingResult | null>(null);

  useEffect(() => {
    api
      .get<PublicBookingData>(`/public/${slug}/booking-data`)
      .then((d) => {
        setData(d);
        setStep("service");
      })
      .catch(() => setStep("not-found"));
  }, [slug]);

  const selectedService = data?.services.find((s) => s.id === serviceId);
  const selectedProfessional = data?.professionals.find((p) => p.id === professionalId);

  async function handleConfirm() {
    if (!data) return;
    setStep("submitting");
    setSubmitError(null);
    try {
      const startTime = new Date(`${date}T${time}:00`).toISOString();
      const res = await api.post<PublicBookingResult>(`/public/${slug}/bookings`, {
        serviceId,
        professionalId,
        startTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        createAccount,
        password: createAccount ? password : undefined,
      });
      setResult(res);
      setStep("success");

      const message = `Hola, ${clientName.trim()}! Tu cita en ${data.organization.name} para ${selectedService?.name} quedó registrada para el ${date} a las ${time}.`;
      const link = waLink(data.organization.phone, message);
      if (link) {
        window.open(link, "_blank");
      }
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "No se pudo confirmar la reserva.");
      setStep("confirm");
    }
  }

  if (step === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-[var(--color-muted)]">
        Cargando…
      </main>
    );
  }

  if (step === "not-found") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <Brand />
        <p className="text-sm text-[var(--color-muted)]">
          No encontramos ninguna barbería con ese enlace.
        </p>
      </main>
    );
  }

  if (!data) return null;

  const STEP_ORDER: Step[] = ["service", "professional", "datetime", "contact", "account", "confirm"];
  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Brand compact />
        <p className="text-sm text-[var(--color-muted)]">
          Reserva tu cita en {data.organization.name}
        </p>
      </div>

      {step !== "success" && (
        <div className="mb-8 h-1 w-full overflow-hidden rounded-full bg-[var(--color-surface-raised)]">
          <div
            className="h-full bg-[var(--color-brass)] transition-all"
            style={{ width: `${((stepIndex + 1) / STEP_ORDER.length) * 100}%` }}
          />
        </div>
      )}

      <Card className="p-6">
        {step === "service" && (
          <StepWrapper title="¿Qué servicio quieres?">
            <div className="flex flex-col gap-2">
              {data.services.map((s) => (
                <OptionButton
                  key={s.id}
                  selected={serviceId === s.id}
                  onClick={() => setServiceId(s.id)}
                  title={s.name}
                  subtitle={`${s.duration} min · ${formatMoney(s.price)}`}
                />
              ))}
            </div>
            <NavButtons onNext={() => setStep("professional")} nextDisabled={!serviceId} />
          </StepWrapper>
        )}

        {step === "professional" && (
          <StepWrapper title="¿Con quién?">
            <div className="flex flex-col gap-2">
              {data.professionals.map((p) => (
                <OptionButton
                  key={p.id}
                  selected={professionalId === p.id}
                  onClick={() => setProfessionalId(p.id)}
                  title={p.name}
                  subtitle={p.bio || undefined}
                />
              ))}
            </div>
            <NavButtons
              onBack={() => setStep("service")}
              onNext={() => setStep("datetime")}
              nextDisabled={!professionalId}
            />
          </StepWrapper>
        )}

        {step === "datetime" && (
          <StepWrapper title="¿Cuándo?">
            <div className="flex flex-col gap-4">
              <InputField
                label="Fecha"
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
              />
              <InputField
                label="Hora"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <NavButtons
              onBack={() => setStep("professional")}
              onNext={() => setStep("contact")}
              nextDisabled={!date || !time}
            />
          </StepWrapper>
        )}

        {step === "contact" && (
          <StepWrapper title="Tus datos">
            <div className="flex flex-col gap-4">
              <InputField
                label="Nombre completo"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
              <InputField
                label="Teléfono"
                value={clientPhone}
                maxLength={11}
                placeholder="8091234567"
                onChange={(e) => setClientPhone(e.target.value.replace(/[^\d]/g, ""))}
              />
              <InputField
                label="Correo (opcional)"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>
            <NavButtons
              onBack={() => setStep("datetime")}
              onNext={() => setStep("account")}
              nextDisabled={!clientName.trim() || clientPhone.trim().length < 7}
            />
          </StepWrapper>
        )}

        {step === "account" && (
          <StepWrapper title="Un último paso">
            <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-[var(--color-border)] p-4">
              <input
                type="checkbox"
                checked={createAccount}
                onChange={(e) => setCreateAccount(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm text-[var(--color-paper)]">
                Crear cuenta para reservar más rápido la próxima vez
              </span>
            </label>

            {createAccount && (
              <div className="mt-4">
                {!clientEmail.trim() && (
                  <p className="mb-3 text-xs text-[var(--color-danger)]">
                    Necesitas un correo para crear la cuenta — vuelve al paso anterior y agrégalo.
                  </p>
                )}
                <PasswordField
                  label="Crea una contraseña"
                  value={password}
                  minLength={6}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            <NavButtons
              onBack={() => setStep("contact")}
              onNext={() => setStep("confirm")}
              nextDisabled={createAccount && (!clientEmail.trim() || password.length < 6)}
            />
          </StepWrapper>
        )}

        {(step === "confirm" || step === "submitting") && (
          <StepWrapper title="Confirma tu reserva">
            <div className="flex flex-col gap-2 rounded-sm border border-[var(--color-border)] p-4 text-sm">
              <SummaryRow label="Servicio" value={selectedService?.name} />
              <SummaryRow label="Con" value={selectedProfessional?.name} />
              <SummaryRow label="Fecha" value={date} />
              <SummaryRow label="Hora" value={time} />
              <SummaryRow label="Nombre" value={clientName} />
              <SummaryRow label="Teléfono" value={clientPhone} />
              {clientEmail && <SummaryRow label="Correo" value={clientEmail} />}
            </div>

            {submitError && (
              <p className="mt-4 rounded-sm bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
                {submitError}
              </p>
            )}

            <div className="mt-6 flex justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep("account")} disabled={step === "submitting"}>
                Atrás
              </Button>
              <Button onClick={handleConfirm} disabled={step === "submitting"}>
                {step === "submitting" ? "Confirmando…" : "Confirmar reserva"}
              </Button>
            </div>
          </StepWrapper>
        )}

        {step === "success" && result && (
          <div className="text-center">
            <p className="font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
              ¡Tu cita quedó confirmada!
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {selectedService?.name} el {date} a las {time} con {selectedProfessional?.name}.
            </p>
            {result.accountCreated && (
              <p className="mt-2 text-xs text-[var(--color-success)]">
                Tu cuenta fue creada — la próxima vez puedes iniciar sesión con tu correo.
              </p>
            )}
            {data.organization.phone && (
              <a
                href={
                  waLink(
                    data.organization.phone,
                    `Hola! Quería confirmar mi cita en ${data.organization.name}.`,
                  ) || "#"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block"
              >
                <Button className="px-6 py-3">Abrir WhatsApp</Button>
              </a>
            )}
          </div>
        )}
      </Card>
    </main>
  );
}

function StepWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-5 font-[family-name:var(--font-display)] text-lg text-[var(--color-paper)]">
        {title}
      </h2>
      {children}
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-6 flex justify-between gap-3">
      {onBack ? (
        <Button variant="ghost" onClick={onBack}>
          Atrás
        </Button>
      ) : (
        <span />
      )}
      <Button onClick={onNext} disabled={nextDisabled}>
        Continuar
      </Button>
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-[var(--color-brass)] bg-[var(--color-brass)]/10"
          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      <p className="text-sm text-[var(--color-paper)]">{title}</p>
      {subtitle && <p className="text-xs text-[var(--color-muted)]">{subtitle}</p>}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="text-[var(--color-paper)]">{value}</span>
    </div>
  );
}
