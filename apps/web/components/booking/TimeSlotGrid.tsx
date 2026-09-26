import { PublicAvailabilitySlot } from "@/lib/api";

interface TimeSlotGridProps {
  slots: PublicAvailabilitySlot[];
  selectedTime: string | null;
  onSelect: (slot: PublicAvailabilitySlot) => void;
}

/**
 * Grilla visual de horarios disponibles. Los bloques ocupados nunca se
 * muestran deshabilitados-pero-visibles con ambigüedad: si un horario no
 * viene en `slots` (porque el backend ya lo excluyó por estar ocupado o
 * fuera de horario de negocio), simplemente no existe en la grilla.
 */
export function TimeSlotGrid({ slots, selectedTime, onSelect }: TimeSlotGridProps) {
  if (slots.length === 0) {
    return (
      <p className="border border-[var(--color-border)] p-4 text-center text-sm text-[var(--color-muted)]">
        No quedan horarios disponibles para este día. Prueba con otra fecha.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => {
        const isSelected = slot.time === selectedTime;
        return (
          <button
            key={`${slot.time}-${slot.professionalId}`}
            type="button"
            onClick={() => onSelect(slot)}
            aria-pressed={isSelected}
            className={`border px-2 py-2.5 text-center text-sm transition-colors ${
              isSelected
                ? "border-[var(--color-brass)] bg-[var(--color-brass)] text-[var(--color-ink)]"
                : "border-[var(--color-border)] text-[var(--color-paper)] hover:border-[var(--color-brass)]"
            }`}
          >
            {slot.time}
          </button>
        );
      })}
    </div>
  );
}
