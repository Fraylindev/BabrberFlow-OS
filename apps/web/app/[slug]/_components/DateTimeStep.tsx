"use client";

import { InputField } from "@/components/ui/Field";
import { TimeSlotGrid } from "@/components/booking/TimeSlotGrid";
import { PublicAvailabilitySlot } from "@/lib/api";
import { useAvailability } from "@/lib/queries/public-booking";
import { ANY_PROFESSIONAL } from "./ProfessionalStep";
import { NavButtons, StepWrapper } from "./shared";

interface DateTimeStepProps {
  slug: string;
  serviceId: string;
  professionalId: string;
  minimumBookingDate: string;
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onSlotSelect: (slot: PublicAvailabilitySlot) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DateTimeStep({
  slug,
  serviceId,
  professionalId,
  minimumBookingDate,
  date,
  time,
  onDateChange,
  onSlotSelect,
  onBack,
  onNext,
}: DateTimeStepProps) {
  const dateIsBeforeMinimum = Boolean(date && date < minimumBookingDate);
  const selectableDate = dateIsBeforeMinimum ? "" : date;
  const { data, isLoading, isError } = useAvailability(slug, {
    serviceId,
    date: selectableDate,
    professionalId: professionalId === ANY_PROFESSIONAL ? undefined : professionalId,
  });

  return (
    <StepWrapper title="¿Cuándo?">
      <div className="flex flex-col gap-4">
        <InputField
          label="Fecha"
          type="date"
          value={date}
          min={minimumBookingDate}
          onChange={(e) => onDateChange(e.target.value)}
        />

        {dateIsBeforeMinimum && (
          <p className="text-sm text-[var(--color-danger)]" role="alert">
            Esa fecha ya pasó en el horario del negocio. Elige otra fecha.
          </p>
        )}

        {!date && (
          <p className="text-sm text-[var(--color-muted)]">Elige una fecha para ver los horarios.</p>
        )}

        {selectableDate && isLoading && (
          <p className="text-sm text-[var(--color-muted)]">Buscando horarios disponibles…</p>
        )}

        {selectableDate && isError && (
          <p className="text-sm text-[var(--color-danger)]">
            No pudimos cargar los horarios. Intenta con otra fecha.
          </p>
        )}

        {selectableDate && data && (
          <TimeSlotGrid slots={data.slots} selectedTime={time || null} onSelect={onSlotSelect} />
        )}
      </div>
      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!selectableDate || !time}
      />
    </StepWrapper>
  );
}
