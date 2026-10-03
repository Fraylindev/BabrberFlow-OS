'use client';
import Link from 'next/link';
import { useCallback } from 'react';
import { useCustomerRead, useCustomerRevalidation, type CustomerBusiness, type CustomerDetail } from '@/lib/queries/customer';
import { customerRoutes, validBookingId } from '@/lib/customer-routes';
import { customerError, customerStatus, CUSTOMER_UNAVAILABLE } from '@/lib/customer-ui';
import { usePublicReadWait } from '@/lib/use-public-read-wait';
import { BusinessTime } from '@/components/ui/BusinessTime';
import { Button } from '@/components/ui/Button';
import { businessWhatsAppLink } from '@/lib/whatsapp-link';
import { isCmsMapsUrl } from '@/lib/cms-ui';
import { CustomerShell } from './CustomerShell';
import { useCustomer } from './CustomerProvider';

export function CustomerBookingDetail({ id }: { id: string }) { return <CustomerShell title="Tu reserva"><DetailContent id={id} /></CustomerShell>; }
function DetailContent({ id }: { id: string }) {
  const session = useCustomer();
  const routes = customerRoutes(session.slug);
  const valid = validBookingId(id);
  const query = useCustomerRead<CustomerDetail>(`/customer/${encodeURIComponent(session.slug)}/bookings/${encodeURIComponent(id)}`, undefined, valid);
  const businesses = useCustomerRead<{ businesses: CustomerBusiness[] }>('/customer/businesses', undefined, valid);
  const wait = usePublicReadWait(query.error, query.errorUpdatedAt);
  const refetch = query.refetch;
  const refresh = useCallback(() => { if (!wait) void refetch(); }, [refetch, wait]);
  useCustomerRevalidation(refresh, valid && wait === 0);
  const booking = query.data;
  const whatsapp = businessWhatsAppLink(booking?.business.phone);
  return <>
    {!valid ? <p role="alert">{CUSTOMER_UNAVAILABLE}</p> : query.isLoading || query.isFetching ? <p role="status">Cargando tu reserva…</p> : query.error ? <div role="alert"><p>{customerError(query.error)}</p><Button disabled={wait > 0} onClick={refresh}>Reintentar</Button></div> : booking && <>
      <h2>{booking.business.name}</h2><div className="customer-card customer-stack"><BusinessTime value={booking.startTime} zone={booking.business.timeZone} className="text-xl" /><h2>{booking.service.name}</h2><p>{booking.professional.name}</p><p>{customerStatus[booking.status]}</p>{booking.business.address && <p>{booking.business.address}</p>}</div>
      {booking.actions.canBookAgain && <Link href={`${routes.bookings}/${encodeURIComponent(id)}/repetir`}>Reservar otra vez</Link>}
      {!booking.actions.canBookAgain && businesses.data?.businesses.some(item => item.slug === session.slug && item.canBook) && <Link href={`${routes.bookings}/${encodeURIComponent(id)}/repetir`}>Elegir otra cita</Link>}
      <p>Para cambiar o cancelar esta reserva, contacta al negocio.</p>
      {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer">Contactar por WhatsApp (se abre en una pestaña nueva)</a>}
      {booking.business.googleMapsUrl && isCmsMapsUrl(booking.business.googleMapsUrl) && <a href={booking.business.googleMapsUrl} target="_blank" rel="noopener noreferrer">Cómo llegar (se abre en una pestaña nueva)</a>}
    </>}
    {wait > 0 && <p role="status">Puedes volver a consultar en {wait} segundos.</p>}
    <Link href={routes.bookings}>Volver a Mis reservas</Link>
  </>;
}
