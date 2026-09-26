import type { RefObject } from "react";
import { Brand } from "@/components/Brand";

interface BookingHeaderProps {
  organizationName: string;
  showProgress: boolean;
  progressRatio: number;
  showBrand?: boolean;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}

export function BookingHeader({
  organizationName,
  showProgress,
  progressRatio,
  showBrand = true,
  headingRef,
}: BookingHeaderProps) {
  return (
    <div className="mb-8 flex flex-col items-center gap-2 text-center">
      {showBrand && <Brand compact />}
      <h2
        id="booking-title"
        ref={headingRef}
        tabIndex={-1}
        className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]"
      >
        Reserva tu cita en {organizationName}
      </h2>

      {showProgress && (
        <div
          className="mt-2 h-1 w-full overflow-hidden bg-[var(--color-surface-raised)]"
          role="progressbar"
          aria-label="Progreso de la reserva"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressRatio * 100)}
        >
          <div
            className="h-full bg-[var(--color-brass)] transition-all"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
