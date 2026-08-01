import { Brand } from "@/components/Brand";

interface BookingHeaderProps {
  organizationName: string;
  showProgress: boolean;
  progressRatio: number;
}

export function BookingHeader({
  organizationName,
  showProgress,
  progressRatio,
}: BookingHeaderProps) {
  return (
    <div className="mb-8 flex flex-col items-center gap-2 text-center">
      <Brand compact />
      <p className="text-sm text-[var(--color-muted)]">Reserva tu cita en {organizationName}</p>

      {showProgress && (
        <div className="mt-2 h-1 w-full overflow-hidden bg-[var(--color-surface-raised)]">
          <div
            className="h-full bg-[var(--color-brass)] transition-all"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
