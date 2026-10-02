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
      <div className="booking-options">
        <OptionButton
          selected={professionalId === ANY_PROFESSIONAL}
          onClick={() => onSelect(ANY_PROFESSIONAL)}
          title="Sin preferencia"
          subtitle="Verás quién te atenderá antes de registrar."
        />
        {professionals.map((p) => (
          <div key={p.id} className="booking-option-row"><OptionButton
            key={p.id}
            selected={professionalId === p.id}
            onClick={() => onSelect(p.id)}
            title={p.name}
          ><BookingPhoto kind="professional" image={media?.professionals.find(item => item.professionalId === p.id)?.avatar} /></OptionButton>
          {p.bio && <details className="booking-option-details"><summary aria-label={`Ver detalles de ${p.name}`}>Ver detalles</summary><p>{p.bio}</p></details>}</div>
        ))}
      </div>
      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={professionalId === null} nextLabel="Ver fechas y horas" />
    </StepWrapper>
  );
}
