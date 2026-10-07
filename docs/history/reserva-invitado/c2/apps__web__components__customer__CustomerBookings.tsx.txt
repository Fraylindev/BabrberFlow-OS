'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { customerRoutes } from '@/lib/customer-routes';
import { CUSTOMER_ASSISTANCE, customerError, customerStatus } from '@/lib/customer-ui';
import { useCustomerRead, useCustomerRevalidation, type CustomerBusiness, type CustomerPage } from '@/lib/queries/customer';
import { usePublicReadWait } from '@/lib/use-public-read-wait';
import { BusinessTime } from '@/components/ui/BusinessTime';
import { Button } from '@/components/ui/Button';
import { CustomerShell } from './CustomerShell';
import { useCustomer } from './CustomerProvider';
import { CustomerClaim } from './CustomerClaim';

export function CustomerBookings({ view }: { view: 'upcoming' | 'history' }) {
  return <CustomerShell title="Mis reservas"><BookingsContent key={view} view={view} /></CustomerShell>;
}
function BookingsContent({ view }: { view: 'upcoming' | 'history' }) {
  const router = useRouter();
  const tablist = useRef<HTMLDivElement>(null);
  const [focusedView, setFocusedView] = useState(view);
  const session = useCustomer();
  const { shouldFocusBookingTab, finishBookingTabFocus } = session;
  const reject = session.reject;
  const routes = customerRoutes(session.slug);
  const [revision, setRevision] = useState(0);
  const [obsolete, setObsolete] = useState(false);
  const client = useQueryClient();
  const businesses = useCustomerRead<{ businesses: CustomerBusiness[] }>('/customer/businesses');
  const refetchBusinesses = businesses.refetch;
  const query = useInfiniteQuery({
    queryKey: ['customer', session.scope, 'bookings', view, revision], initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) => api.get<CustomerPage>(`/customer/${encodeURIComponent(session.slug)}/bookings`, { view, limit: '20', ...(pageParam ? { cursor: pageParam } : {}) }, session.options(signal)),
    getNextPageParam: page => page.nextCursor ?? undefined,
    enabled: session.loaded && session.signedIn && !session.blocked && Boolean(businesses.data?.businesses.some(business => business.slug === session.slug)),
  });
  const error = businesses.error ?? query.error;
  const wait = usePublicReadWait(error, Math.max(businesses.errorUpdatedAt, query.errorUpdatedAt));
  const staleCursor = query.isError && query.error instanceof ApiError && [400, 409].includes(query.error.status);
  useEffect(() => {
    if (!staleCursor) return;
    // Retirar también el contenido en memoria antes de una nueva lectura autorizada.
    queueMicrotask(() => {
      setObsolete(true);
      client.setQueryData<InfiniteData<CustomerPage>>(['customer', session.scope, 'bookings', view, revision], { pages: [], pageParams: [] });
    });
  }, [staleCursor, client, session.scope, view, revision]);
  useEffect(() => { if (query.error instanceof ApiError && [401, 403, 404].includes(query.error.status)) reject(); }, [query.error, reject]);
  const refresh = useCallback(() => {
    if (wait > 0) return;
    // Reiniciar desde la primera página: no mezclar revisiones ni instantes de lectura.
    setRevision(value => value + 1);
    setObsolete(false);
    void refetchBusinesses();
  }, [refetchBusinesses, wait]);
  useCustomerRevalidation(refresh, wait === 0);
  const business = businesses.data?.businesses.find(business => business.slug === session.slug);
  useEffect(() => {
    if (!business || !shouldFocusBookingTab()) return;
    const frame = requestAnimationFrame(() => {
      tablist.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
      finishBookingTabFocus();
    });
    return () => cancelAnimationFrame(frame);
  }, [business, shouldFocusBookingTab, finishBookingTabFocus]);
  function selectView(next: 'upcoming' | 'history') {
    if (next === view) return;
    session.requestBookingTabFocus();
    router.push(next === 'history' ? `${routes.bookings}?vista=historial` : routes.bookings, { scroll: false });
  }
  return <>
    <CustomerClaim />
    {businesses.isLoading ? <p role="status">Cargando tus negocios…</p> : businesses.isError ? <div role="alert"><p>{customerError(businesses.error)}</p><Button disabled={wait > 0 || businesses.isFetching} onClick={() => void businesses.refetch()}>Reintentar</Button></div> : !business ? <><p>Aún no has añadido reservas a tu cuenta en este negocio.</p><p>{CUSTOMER_ASSISTANCE}</p><Link href={routes.root}>Volver al negocio</Link></> : <>
      <h2>{business.name}</h2>
      {businesses.data!.businesses.length > 1 && <nav aria-label="Tus negocios">{businesses.data!.businesses.map(item => <Link key={item.slug} href={customerRoutes(item.slug).bookings} aria-current={item.slug === session.slug ? 'page' : undefined}>{item.name}</Link>)}</nav>}
      <nav aria-label="Vista de reservas"><div ref={tablist} role="tablist" aria-label="Tus reservas" onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 'upcoming' : event.key === 'End' ? 'history' : focusedView === 'upcoming' ? 'history' : 'upcoming';
        setFocusedView(next);
        tablist.current?.querySelector<HTMLButtonElement>(`#customer-tab-${next}`)?.focus();
      }}>{(['upcoming', 'history'] as const).map(tab => <Button key={tab} type="button" variant="ghost" role="tab" id={`customer-tab-${tab}`} aria-selected={view === tab} aria-controls="customer-bookings-panel" tabIndex={focusedView === tab ? 0 : -1} onFocus={() => setFocusedView(tab)} onClick={() => selectView(tab)}>{tab === 'upcoming' ? 'Próximas' : 'Historial'}</Button>)}</div><Button variant="ghost" disabled={query.isFetching || wait > 0} onClick={refresh}>Actualizar lista</Button></nav>
      <div role="tabpanel" id="customer-bookings-panel" aria-labelledby={`customer-tab-${view}`} tabIndex={0}>
      {obsolete ? <div role="alert"><p>Tus reservas cambiaron o la consulta venció. Actualiza la lista para continuar.</p><Button disabled={wait > 0 || query.isFetching} onClick={refresh}>Actualizar lista</Button></div> : query.isPending || (query.isFetching && !query.isFetchingNextPage) ? <p role="status">Cargando tus reservas…</p> : query.isError ? <div role="alert" className="space-y-3"><p>{staleCursor ? 'Tus reservas cambiaron o la consulta venció. Actualiza la lista para continuar.' : customerError(query.error)}</p><Button disabled={wait > 0 || query.isFetching} onClick={refresh}>Actualizar lista</Button></div> : query.data && <>
        {!query.data.pages.some(page => page.items.length) ? <><p>{view === 'upcoming' ? 'No tienes próximas reservas vinculadas a tu cuenta en este negocio.' : 'Todavía no hay reservas en tu historial de este negocio.'}</p>{view === 'upcoming' && business.canBook ? <Link href={routes.reserve}>Reservar cita</Link> : <Link href={routes.bookings}>Ver próximas reservas</Link>}</> : <ul className="customer-stack">{query.data.pages.flatMap(page => page.items.map(item => <li key={item.id} className="customer-card space-y-2"><p><BusinessTime value={item.startTime} zone={page.business.timeZone} /></p><h2>{item.service.name}</h2><p>{item.professional.name}</p><p className="customer-muted">{customerStatus[item.status]}</p><Link href={`${routes.bookings}/${encodeURIComponent(item.id)}`}>Ver reserva</Link></li>))}</ul>}
        {query.hasNextPage && <Button variant="secondary" disabled={query.isFetching || wait > 0} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Cargando más reservas…' : 'Ver más'}</Button>}
      </>}
      </div>
    </>}
    {wait > 0 && <p role="status">Puedes volver a consultar en {wait} segundos.</p>}
  </>;
}
