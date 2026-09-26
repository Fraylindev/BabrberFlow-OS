import { Professional } from "@/lib/api";
import { NavButtons, OptionButton, StepWrapper } from "./shared";

// "" representa "Cualquiera disponible": el backend resuelve qué
// profesional queda asignado según quién esté libre en el horario elegido.
export const ANY_PROFESSIONAL = "";

interface ProfessionalStepProps {
  professionals: Pick<Professional, "id" | "name" | "bio" | "avatar">[];
  professionalId: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ProfessionalStep({
  professionals,
  professionalId,
  onSelect,
  onBack,
  onNext,
}: ProfessionalStepProps) {
  return (
    <StepWrapper title="¿Con quién?">
      <div className="flex flex-col gap-2">
        <OptionButton
          selected={professionalId === ANY_PROFESSIONAL}
          onClick={() => onSelect(ANY_PROFESSIONAL)}
          title="Cualquiera disponible"
          subtitle="Te asignamos a quien tenga espacio en el horario que elijas"
        />
        {professionals.map((p) => (
          <OptionButton
            key={p.id}
            selected={professionalId === p.id}
            onClick={() => onSelect(p.id)}
            title={p.name}
            subtitle={p.bio || undefined}
          />
        ))}
      </div>
      <NavButtons onBack={onBack} onNext={onNext} nextDisabled={professionalId === null} />
    </StepWrapper>
  );
}
