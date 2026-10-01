import { Service } from "@/lib/api";
import { formatMoney, NavButtons, OptionButton, StepWrapper } from "./shared";
import { BookingPhoto } from '@/components/public/BookingPhoto';
import type { PublicMedia } from '@/lib/media-ui';

interface ServiceStepProps {
  services: Pick<Service, "id" | "name" | "description" | "duration" | "price">[];
  serviceId: string;
  onSelect: (id: string) => void;
  onNext: () => void;
  media?: PublicMedia | null;
}

export function ServiceStep({ services, serviceId, onSelect, onNext, media }: ServiceStepProps) {
  return (
    <StepWrapper title="Selecciona el servicio">
      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((s) => (
          <OptionButton
            key={s.id}
            selected={serviceId === s.id}
            onClick={() => onSelect(s.id)}
            title={s.name}
            subtitle={`Duración: ${s.duration} min · ${formatMoney(s.price)}`}
          ><BookingPhoto image={media?.services.find(item => item.serviceId === s.id)?.image} />
            {s.description && <p className="my-2 text-sm text-[var(--color-muted)]">{s.description}</p>}
          </OptionButton>
        ))}
      </div>
      <NavButtons onNext={onNext} nextDisabled={!serviceId} nextLabel="Elegir profesional" />
    </StepWrapper>
  );
}
