import { Professional } from "@/lib/api";
import { NavButtons, OptionButton, StepWrapper } from "./shared";
import { BookingPhoto } from '@/components/public/BookingPhoto';
import type { PublicMedia } from '@/lib/media-ui';

// "" representa "Cualquiera disponible": el backend resuelve qué
// profesional queda asignado según quién esté libre en el horario elegido.
export const ANY_PROFESSIONAL = "";

interface ProfessionalStepProps {
  professionals: Pick<Professional, "id" | "name" | "bio" | "avatar">[];
  professionalId: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
  media?: PublicMedia | null;
}

export function ProfessionalStep({
  professionals,
  professionalId,
  onSelect,
  onBack,
  onNext,
  media,
}: ProfessionalStepProps) {
  return (
    <StepWrapper title="Elige un profesional">
      <div className="flex flex-col gap-2">
        <OptionButton
          selected={professionalId === ANY_PROFESSIONAL}
          onClick={() => onSelect(ANY_PROFESSIONAL)}
          title="Cualquiera disponible"
          subtitle="Te mostraremos horarios con un profesional disponible. Verás quién te atenderá antes de registrar la reserva."
        />
        {professionals.map((p) => (
          <OptionButton
            key={p.id}
            selected={professionalId === p.id}
            onClick={() => onSelect(p.id)}
            title={p.name}
            subtitle={p.bio || undefined}
          ><BookingPhoto kind="professional" image={media?.professionals.find(item => item.professionalId === p.id)?.avatar} /></OptionButton>
        ))}
      </div>
      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={professionalId === null} nextLabel="Ver fechas y horas" />
    </StepWrapper>
  );
}
