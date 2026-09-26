import { Service } from "@/lib/api";
import { formatMoney, NavButtons, OptionButton, StepWrapper } from "./shared";

interface ServiceStepProps {
  services: Pick<Service, "id" | "name" | "description" | "duration" | "price">[];
  serviceId: string;
  onSelect: (id: string) => void;
  onNext: () => void;
}

export function ServiceStep({ services, serviceId, onSelect, onNext }: ServiceStepProps) {
  return (
    <StepWrapper title="¿Qué servicio quieres?">
      <div className="flex flex-col gap-2">
        {services.map((s) => (
          <OptionButton
            key={s.id}
            selected={serviceId === s.id}
            onClick={() => onSelect(s.id)}
            title={s.name}
            subtitle={`${s.duration} min · ${formatMoney(s.price)}`}
          />
        ))}
      </div>
      <NavButtons onNext={onNext} nextDisabled={!serviceId} />
    </StepWrapper>
  );
}
