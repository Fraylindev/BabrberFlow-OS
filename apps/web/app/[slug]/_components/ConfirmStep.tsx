import { Button } from '@/components/ui/Button';
import { BusinessTime } from '@/components/ui/BusinessTime';
import { BookingPhoto } from '@/components/public/BookingPhoto';
import type { PublicMediaImage } from '@/lib/media-ui';
import { formatMoney, StepWrapper } from './shared';
import { formatServiceDuration } from '@/lib/service-ui';
import { formatPublicPhone } from '@/lib/public-phone';

export function ConfirmStep({ serviceName, professionalName, startTime, timeZone, duration, price, servicePhoto, professionalPhoto,
  clientName, clientPhone, clientEmail, address, submitting, submitError, onBack, onConfirm, onEdit, waiting = false,
}: {
  serviceName?: string; professionalName?: string; startTime: string; timeZone: string; duration?: number; price?: string | number;
  servicePhoto?: PublicMediaImage; professionalPhoto?: PublicMediaImage;
  address?: string | null;
  clientName: string; clientPhone: string; clientEmail: string; submitting: boolean; submitError: string | null; waiting?: boolean;
  onBack: () => void; onConfirm: () => void; onEdit?: (step: 'service' | 'professional' | 'datetime' | 'contact') => void;
}) {
  const heading = (step: 'service' | 'professional' | 'datetime' | 'contact', label: string) => <div className="booking-summary-heading"><h3>{label}</h3>{onEdit && <button type="button" className="booking-text-action" disabled={submitting} aria-label={`Editar ${step === 'contact' ? 'datos' : label.toLocaleLowerCase('es')}`} onClick={() => onEdit(step)}>Editar</button>}</div>;
  return <StepWrapper title="Revisa tu reserva">
    <div className="booking-summary">
      <section className="booking-summary-section booking-summary-date">{heading('datetime', 'Fecha y hora')}<BusinessTime value={startTime} zone={timeZone} className="block text-2xl font-medium" /></section>
      <section className="booking-summary-section">{heading('service', 'Servicio')}<div className="booking-summary-row"><BookingPhoto compact name={serviceName} image={servicePhoto} /><div className="min-w-0 flex-1"><p className="font-medium">{serviceName || 'Servicio seleccionado'}</p>
        <p className="booking-service-meta">{duration ? formatServiceDuration(duration) : null}{duration && price !== undefined ? ' · ' : ''}{price !== undefined ? formatMoney(price) : null}</p></div></div></section>
      <section className="booking-summary-section">{heading('professional', 'Profesional')}<div className="booking-summary-row"><BookingPhoto compact kind="professional" name={professionalName || 'Profesional'} image={professionalPhoto} /><p className="min-w-0">Te atenderá {professionalName || 'el profesional seleccionado'}</p></div></section>
      {address && <p className="text-sm text-[var(--color-muted)]">{address}</p>}
      <section className="booking-summary-section">{heading('contact', 'Tus datos')}<div className="space-y-1"><p className="font-medium">{clientName}</p><p>{formatPublicPhone(clientPhone)}</p>{clientEmail && <p>{clientEmail}</p>}</div></section>
    </div>
    <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">La reserva quedará pendiente de confirmación del negocio.</p>
    {submitError && <p role="alert" className="mt-4 text-[var(--color-danger)]">{submitError}</p>}
    <div className="booking-nav"><Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>Atrás</Button><Button type="button" className="booking-primary" aria-busy={submitting} onClick={onConfirm} disabled={submitting || waiting}>{submitting ? 'Registrando tu reserva…' : waiting ? 'Espera un momento' : 'Registrar reserva'}</Button></div>
  </StepWrapper>;
}
