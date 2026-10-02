import { Service } from "@/lib/api";
import { formatMoney, NavButtons, OptionButton, StepWrapper } from "./shared";
import { BookingPhoto } from '@/components/public/BookingPhoto';
import type { PublicMedia } from '@/lib/media-ui';
import { formatServiceDuration } from '@/lib/service-ui';

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
      <div className="booking-options">
        {services.map((s) => (
          <div key={s.id} className="booking-option-row"><OptionButton
            key={s.id}
            selected={serviceId === s.id}
            onClick={() => onSelect(s.id)}
            title={s.name}
            subtitle={formatServiceDuration(s.duration)}
            trailing={formatMoney(s.price)}
          ><BookingPhoto name={s.name} image={media?.services.find(item => item.serviceId === s.id)?.image} />
          </OptionButton>
          {s.description && <details className="booking-option-details"><summary aria-label={`Ver descripción de ${s.name}`}>Ver descripción</summary><p>{s.description}</p></details>}</div>
        ))}
      </div>
      <NavButtons onNext={onNext} nextDisabled={!serviceId} nextLabel="Elegir profesional" />
    </StepWrapper>
  );
}
