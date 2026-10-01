import { Button } from "@/components/ui/Button";
import { StepWrapper, SummaryRow } from "./shared";
import { BusinessTime } from '@/components/ui/BusinessTime';

interface ConfirmStepProps {
  serviceName?: string;
  professionalName?: string;
  startTime: string;
  timeZone: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  submitError: string | null;
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export function ConfirmStep({
  serviceName,
  professionalName,
  startTime,
  timeZone,
  clientName,
  clientPhone,
  clientEmail,
  submitError,
  submitting,
  onBack,
  onConfirm,
}: ConfirmStepProps) {
  return (
    <StepWrapper title="Confirma tu reserva">
      <div className="flex flex-col gap-2 border border-[var(--color-border)] p-4 text-sm">
        <SummaryRow label="Servicio" value={serviceName} />
        <SummaryRow label="Con" value={professionalName} />
        <SummaryRow label="Fecha y hora" value={<BusinessTime value={startTime} zone={timeZone} />} />
        <SummaryRow label="Nombre" value={clientName} />
        <SummaryRow label="Teléfono" value={clientPhone} />
        {clientEmail && <SummaryRow label="Correo" value={clientEmail} />}
      </div>

      {submitError && (
        <p className="mt-4 bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {submitError}
        </p>
      )}

      <div className="mt-6 flex justify-between gap-3">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          Atrás
        </Button>
        <Button onClick={onConfirm} disabled={submitting}>
          {submitting ? "Confirmando…" : "Confirmar reserva"}
        </Button>
      </div>
    </StepWrapper>
  );
}
