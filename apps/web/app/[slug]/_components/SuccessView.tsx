'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { BusinessTime } from '@/components/ui/BusinessTime';
import { BookingPhoto } from '@/components/public/BookingPhoto';
import { bookingCalendar } from '@/lib/public-booking-ui';
import { isCmsMapsUrl } from '@/lib/cms-ui';
import type { PublicMediaImage } from '@/lib/media-ui';
import type { PublicBookingResult } from '@/lib/api';
import { bookingWhatsAppLink } from '@/lib/whatsapp-link';
import { formatServiceDuration } from '@/lib/service-ui';
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
      <div className="booking-summary-row"><BookingPhoto compact name={serviceName} image={servicePhoto} /><div className="min-w-0 flex-1"><p className="font-medium">{serviceName || 'Servicio seleccionado'}</p><p className="booking-service-meta">{formatServiceDuration(Math.round((Date.parse(result.booking.endTime) - Date.parse(result.booking.startTime)) / 60000))}{price !== undefined ? ` · ${formatMoney(price)}` : ''}</p></div></div>
      <div className="booking-summary-row"><BookingPhoto compact kind="professional" name={professionalName || 'Profesional'} image={professionalPhoto} /><p className="min-w-0">{professionalName ? `Te atenderá ${professionalName}` : 'Profesional seleccionado'}</p></div>
      {organizationName && <span className="sr-only">{organizationName}</span>}
    </div>
    {result.accountCreated && <p className="text-sm leading-6">Se creó la cuenta de prueba. El acceso a tus reservas todavía no está disponible.</p>}
    {!result.accountCreated && result.accountCreationError && <p className="text-sm leading-6">Tu reserva quedó registrada. La cuenta no se creó; no necesitas repetir la reserva.</p>}
    <div className="space-y-4">
      {calendarAvailable && <Button type="button" className="booking-primary calendar-action" onClick={downloadCalendar}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 11h18M9 16h6M12 13v6" /></svg>Agregar al calendario</Button>}
      {link && <a href={link} target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp (se abre en una pestaña nueva)" className="booking-secondary-action">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.91 11.91 0 0 0 12.04 0C5.42 0 .03 5.39 .02 12.01a11.95 11.95 0 0 0 1.6 5.99L0 24l6.14-1.61a12.03 12.03 0 0 0 5.89 1.5h.01c6.61 0 12-5.39 12.01-12.01a11.93 11.93 0 0 0-3.53-8.4ZM12.04 21.87h-.01a9.97 9.97 0 0 1-5.08-1.39l-.36-.21-3.77.99 1.01-3.67-.24-.38a9.96 9.96 0 0 1-1.52-5.2c0-5.5 4.48-9.98 9.98-9.98a9.91 9.91 0 0 1 7.06 2.93 9.92 9.92 0 0 1 2.92 7.06c0 5.5-4.48 9.85-9.99 9.85Zm5.48-7.39c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.59-.48-.51-.67-.52h-.57c-.2 0-.53.08-.81.38-.28.3-1.07 1.05-1.07 2.55s1.1 2.95 1.25 3.15c.15.2 2.17 3.31 5.26 4.64.73.31 1.3.5 1.74.64.73.23 1.39.2 1.91.12.58-.09 1.77-.73 2.02-1.43.25-.7.25-1.3.18-1.43-.08-.12-.28-.2-.58-.35Z" /></svg>
        Contactar por WhatsApp
      </a>}
      {(address || safeMaps) && <div className="space-y-3 pt-2">
        {address && <p className="text-sm text-[var(--color-muted)]">{address}</p>}
        {safeMaps && <a href={safeMaps} target="_blank" rel="noopener noreferrer" className="booking-secondary-action" aria-label="Cómo llegar (se abre en una pestaña nueva)">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3ZM9 3v15M15 6v15" /></svg>Cómo llegar
        </a>}
      </div>}
      {returnHref && <>
        <p className="text-sm leading-6 text-[var(--color-muted)]">Guarda este resumen. Para consultar o cambiar tu cita, contacta al negocio.</p>
        <Link href={returnHref} className="booking-return-link">Listo</Link>
      </>}
    </div>
  </div>;
}
