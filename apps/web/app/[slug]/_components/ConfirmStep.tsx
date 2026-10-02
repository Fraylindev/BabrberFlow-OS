import { Button } from '@/components/ui/Button';
import { BusinessTime } from '@/components/ui/BusinessTime';
import { BookingPhoto } from '@/components/public/BookingPhoto';
import type { PublicMediaImage } from '@/lib/media-ui';
import { formatMoney, StepWrapper } from './shared';

export function ConfirmStep({ serviceName, professionalName, startTime, timeZone, duration, price, servicePhoto, professionalPhoto,
  clientName, clientPhone, clientEmail, address, submitting, submitError, onBack, onConfirm, onEdit, waiting = false,
}: {
  serviceName?: string; professionalName?: string; startTime: string; timeZone: string; duration?: number; price?: string | number;
  servicePhoto?: PublicMediaImage; professionalPhoto?: PublicMediaImage;
  address?: string | null;
  clientName: string; clientPhone: string; clientEmail: string; submitting: boolean; submitError: string | null; waiting?: boolean;
  onBack: () => void; onConfirm: () => void; onEdit?: (step: 'service' | 'professional' | 'datetime' | 'contact') => void;
}) {
  const edit = (step: 'service' | 'professional' | 'datetime' | 'contact', label: string) => onEdit && <Button type="button" variant="ghost" disabled={submitting} onClick={() => onEdit(step)}>Editar {label}</Button>;
  return <StepWrapper title="Revisa tu reserva">
    <div className="booking-summary space-y-5">
      <div className="text-xl font-medium"><BusinessTime value={startTime} zone={timeZone} />{edit('datetime', 'fecha y hora')}</div>
      <div className="flex gap-3"><BookingPhoto compact image={servicePhoto} /><div className="min-w-0 flex-1"><p className="font-medium">{serviceName || 'Servicio seleccionado'}</p>
        {duration && <p className="text-sm text-[var(--color-muted)]">{duration} min</p>}
        {price !== undefined && <p className="text-sm">{formatMoney(price)} · precio de catálogo</p>}{edit('service', 'servicio')}</div></div>
      <div className="flex gap-3"><BookingPhoto compact kind="professional" image={professionalPhoto} /><div className="min-w-0 flex-1"><p>Te atenderá {professionalName || 'el profesional seleccionado'}</p>{edit('professional', 'profesional')}</div></div>
      {address && <p className="text-sm text-[var(--color-muted)]">{address}</p>}
      <div className="border-t border-[var(--color-border)] pt-3"><p>{clientName}</p><p>{clientPhone}</p>{clientEmail && <p>{clientEmail}</p>}{edit('contact', 'datos')}</div>
    </div>
    <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">La reserva quedará pendiente de confirmación del negocio.</p>
    {submitError && <p role="alert" className="mt-4 text-[var(--color-danger)]">{submitError}</p>}
    <div className="booking-nav"><Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>Atrás</Button><Button type="button" className="booking-primary" onClick={onConfirm} disabled={submitting || waiting}>{submitting ? 'Registrando tu reserva…' : waiting ? 'Espera un momento' : 'Registrar reserva'}</Button></div>
  </StepWrapper>;
}
