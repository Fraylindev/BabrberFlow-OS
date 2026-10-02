'use client';

import Link from 'next/link';
import { useId } from 'react';
import { Button } from '@/components/ui/Button';
import { BusinessTime } from '@/components/ui/BusinessTime';
import { BookingPhoto } from '@/components/public/BookingPhoto';
import { bookingCalendar } from '@/lib/public-booking-ui';
import { isCmsMapsUrl } from '@/lib/cms-ui';
import type { PublicMediaImage } from '@/lib/media-ui';
import type { PublicBookingResult } from '@/lib/api';
import { bookingWhatsAppLink, WHATSAPP_EXPLANATION } from '@/lib/whatsapp-link';
import { formatServiceDuration } from '@/lib/service-ui';
import { formatPublicPhone } from '@/lib/public-phone';
import { formatMoney } from './shared';

export function SuccessView({ result, organizationPhone, serviceName, professionalName, timeZone,
  organizationName, address, mapsUrl, returnHref, servicePhoto, professionalPhoto, price,
}: {
  result: PublicBookingResult; organizationPhone: string | null; serviceName?: string; professionalName?: string; timeZone: string;
  organizationName?: string; address?: string | null; mapsUrl?: string | null; returnHref?: string;
  servicePhoto?: PublicMediaImage; professionalPhoto?: PublicMediaImage;
  price?: string | number;
}) {
  const link = bookingWhatsAppLink(organizationPhone);
  const explanationId = useId();
  const pending = result.booking.status === 'PENDING';
  const calendarAvailable = pending && Date.parse(result.booking.endTime) > Date.parse(result.booking.startTime);
  const safeMaps = mapsUrl && isCmsMapsUrl(mapsUrl) ? mapsUrl : null;
  function downloadCalendar() {
    const text = bookingCalendar(result, serviceName || 'Servicio seleccionado', crypto.randomUUID(), new Date());
    if (!text) return;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'cita-pendiente.ics'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="space-y-6">
    <div>
      <div className="booking-success-mark" aria-hidden="true"><svg width="34" height="34" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m7 16 6 6 12-13" /></svg></div>
      <h2 id="booking-success-title" tabIndex={-1} className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-paper)]">Tu reserva quedó registrada</h2>
      <p role="status" className="mt-3 text-sm text-[var(--color-pending)]">{pending ? 'Pendiente de confirmación' : 'Consulta el estado con el negocio'}</p>
    </div>
    <div className="booking-summary space-y-4">
      <div className="booking-summary-date"><BusinessTime value={result.booking.startTime} zone={timeZone} className="block text-2xl font-medium" /></div>
      <div className="booking-summary-row"><BookingPhoto compact name={serviceName} image={servicePhoto} /><div className="min-w-0 flex-1"><p className="font-medium">{serviceName || 'Servicio seleccionado'}</p><p className="text-sm text-[var(--color-muted)]">{formatServiceDuration(Math.round((Date.parse(result.booking.endTime) - Date.parse(result.booking.startTime)) / 60000))}</p></div>{price !== undefined && <p className="booking-summary-price">{formatMoney(price)}</p>}</div>
      <div className="booking-summary-row"><BookingPhoto compact kind="professional" name={professionalName || 'Profesional'} image={professionalPhoto} /><p className="min-w-0">{professionalName ? `Te atenderá ${professionalName}` : 'Profesional seleccionado'}</p></div>
      {organizationName && <span className="sr-only">{organizationName}</span>}{address && <p className="text-sm text-[var(--color-muted)]">{address}</p>}
      {safeMaps && <a href={safeMaps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center underline">Cómo llegar (se abre en una pestaña nueva)</a>}
    </div>
    {result.accountCreated && <p className="text-sm leading-6">Se creó la cuenta de prueba. El acceso a tus reservas todavía no está disponible.</p>}
    {!result.accountCreated && result.accountCreationError && <p className="text-sm leading-6">Tu reserva quedó registrada. La cuenta no se creó; no necesitas repetir la reserva.</p>}
    {returnHref && <div className="space-y-3">
      {calendarAvailable && <Button type="button" className="booking-primary calendar-action" onClick={downloadCalendar}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 11h18M9 16h6M12 13v6" /></svg>Agregar al calendario</Button>}
      <Link href={returnHref} className="booking-return-link">← Volver al negocio</Link>
      <p className="text-sm leading-6 text-[var(--color-muted)]">Guarda este resumen. Para consultar o cambiar tu cita, contacta al negocio.</p>
    </div>}
    {link && <div className="border-t border-[var(--color-border)] pt-5">
      {organizationPhone && <p className="mb-2 text-sm">{formatPublicPhone(organizationPhone)}</p>}
      <p id={explanationId} className="text-sm leading-6 text-[var(--color-muted)]">{WHATSAPP_EXPLANATION}</p>
      <a href={link} target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp (se abre en una pestaña nueva)" aria-describedby={explanationId}
        className="mt-3 inline-flex min-h-12 items-center justify-center border border-[var(--color-muted)] px-5 text-sm font-medium text-[var(--color-paper)]">Abrir WhatsApp</a>
    </div>}
  </div>;
}
