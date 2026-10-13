'use client';
import { useLayoutEffect, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { api, type AuthUser, type Organization, type BookingStatus } from '@/lib/api';
import {
  addBusinessDays,
  businessDate,
  calendarApi,
  calendarScope,
  calendarStatus,
  formatCalendarDate,
} from '@/lib/calendar';
import { businessDayRange } from '../../../api/src/common/business-time.presentation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { CalendarDetail } from './CalendarDetail';
import { CalendarTime } from './CalendarTime';
import { CalendarFailure } from './CalendarFailure';
export default function CalendarScreen() {
  const { user } = useAuth();
  return user ? (
    <CalendarVisit key={calendarScope(user)} user={user} />
  ) : (
    <p role="status">Preparando tu acceso a la agenda…</p>
  );
}
function CalendarVisit({ user }: { user: AuthUser }) {
  const client = useQueryClient(),
    [visit] = useState(() => crypto.randomUUID()),
    scope = calendarScope(user);
  const prefix = ['m3-calendar', scope, visit];
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
      void client.cancelQueries({ queryKey: ['m3-calendar', scope, visit] });
      client.removeQueries({ queryKey: ['m3-calendar', scope, visit] });
    };
  }, [client, scope, visit]);
  const org = useQuery({
    queryKey: [...prefix, 'zone'],
    queryFn: ({ signal }) =>
      api.get<Organization>('/organizations/mine', undefined, { signal, cache: 'no-store' }),
    enabled: ready,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (org.isPending) return <p role="status">Cargando la hora del negocio…</p>;
  if (org.error || !org.data?.timeZone)
    return (
      <Card tone="light" className="space-y-3 p-4">
        <CalendarFailure
          key={org.errorUpdatedAt}
          error={org.error}
          onRetry={() => void org.refetch()}
        />
      </Card>
    );
  return <CalendarAgenda user={user} zone={org.data.timeZone} prefix={prefix} />;
}
function CalendarAgenda({
  user,
  zone,
  prefix,
}: {
  user: AuthUser;
  zone: string;
  prefix: string[];
}) {
  const client = useQueryClient();
  const [anchor, setAnchor] = useState(() => businessDate(new Date(), zone)),
    [mode, setMode] = useState<'day' | 'week'>('week'),
    [status, setStatus] = useState<BookingStatus | ''>(''),
    [professional, setProfessional] = useState(''),
    [selected, setSelected] = useState<string | null>(null),
    [notice, setNotice] = useState(''),
    [search, setSearch] = useState(''),
    [catalogSearch, setCatalogSearch] = useState('');
  const weekday = new Date(anchor + 'T00:00:00Z').getUTCDay();
  const from = mode === 'day' ? anchor : addBusinessDays(anchor, weekday === 0 ? -6 : 1 - weekday)!;
  const length = mode === 'day' ? 1 : 7,
    to = addBusinessDays(from, length)!;
  const params: Record<string, string> = {
    from,
    to,
    limit: '100',
    ...(status ? { status } : {}),
    ...(professional ? { professionalId: professional } : {}),
  };
  const pageKey = [...prefix, 'pages', params];
  const pages = useInfiniteQuery({
    queryKey: pageKey,
    initialPageParam: '',
    queryFn: ({ signal, pageParam }) =>
      calendarApi.page({ ...params, ...(pageParam ? { cursor: pageParam } : {}) }, signal),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  const catalog = useInfiniteQuery({
    queryKey: [...prefix, 'professionals', catalogSearch],
    initialPageParam: 1,
    queryFn: async ({ signal, pageParam }) => {
      const res = await api.getWithHeaders<{ id: string; name: string }[]>(
        '/professionals',
        {
          page: String(pageParam),
          limit: '100',
          ...(catalogSearch ? { search: catalogSearch } : {}),
        },
        { signal, cache: 'no-store' },
      );
      return {
        items: res.data.map((p) => ({ id: p.id, name: p.name })),
        page: pageParam,
        totalPages: Number(res.headers.get('X-Total-Pages') ?? 1),
      };
    },
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: user.role !== 'BARBER',
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const items = pages.error ? [] : (pages.data?.pages.flatMap((p) => p.items) ?? []);
  const days = Array.from({ length }, (_, i) => addBusinessDays(from, i)!);
  function reload() {
    setSelected(null);
    setNotice('');
    void client.resetQueries({ queryKey: pageKey, exact: true });
  }
  function goToToday() {
    const today = businessDate(new Date(), zone);
    const todayWeekday = new Date(today + 'T00:00:00Z').getUTCDay();
    const todayFrom =
      mode === 'day' ? today : addBusinessDays(today, todayWeekday === 0 ? -6 : 1 - todayWeekday)!;
    setAnchor(today);
    setSelected(null);
    setNotice('');
    if (todayFrom === from) void client.resetQueries({ queryKey: pageKey, exact: true });
  }
  return (
    <div className="space-y-5">
      <PageHeader
        tone="light"
        title={user.role === 'BARBER' ? 'Mi agenda' : 'Agenda'}
        description="Consulta las citas y organiza los cambios de horario. Todas las horas corresponden al negocio."
      />
      <Card tone="light" className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            tone="light"
            variant={mode === 'day' ? 'primary' : 'secondary'}
            aria-pressed={mode === 'day'}
            onClick={() => setMode('day')}
          >
            Día
          </Button>
          <Button
            tone="light"
            variant={mode === 'week' ? 'primary' : 'secondary'}
            aria-pressed={mode === 'week'}
            onClick={() => setMode('week')}
          >
            Semana
          </Button>
          <Button
            tone="light"
            variant="secondary"
            title="Volver a hoy y actualizar la agenda"
            onClick={goToToday}
          >
            Hoy
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Button
            tone="light"
            variant="secondary"
            aria-label="Periodo anterior"
            onClick={() => setAnchor(addBusinessDays(anchor, -length)!)}
          >
            Anterior
          </Button>
          <label className="text-sm">
            Fecha
            <input
              type="date"
              className="mt-1 block max-w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)] p-2 text-base"
              value={anchor}
              onChange={(e) => {
                if (e.target.value && addBusinessDays(e.target.value, 7)) setAnchor(e.target.value);
              }}
            />
          </label>
          <Button
            tone="light"
            variant="secondary"
            aria-label="Periodo siguiente"
            onClick={() => setAnchor(addBusinessDays(anchor, length)!)}
          >
            Siguiente
          </Button>
          <label className="text-sm">
            Estado
            <select
              aria-label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value as BookingStatus | '')}
              className="mt-1 block rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)] p-2 text-base"
            >
              <option value="">Todos los estados</option>
              {Object.entries(calendarStatus).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {user.role !== 'BARBER' && (
          <div className="flex flex-wrap items-end gap-3">
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setProfessional('');
                setCatalogSearch(search.trim());
              }}
            >
              <label className="text-sm">
                Buscar profesional
                <input
                  value={search}
                  maxLength={100}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mt-1 block w-48 max-w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)] p-2 text-base"
                />
              </label>
              <Button tone="light" variant="secondary" type="submit">
                Buscar
              </Button>
            </form>
            <label className="text-sm">
              Profesional
              <select
                aria-label="Profesional"
                value={professional}
                onChange={(e) => setProfessional(e.target.value)}
                className="mt-1 block max-w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)] p-2 text-base"
              >
                <option value="">Todos los profesionales</option>
                {catalog.data?.pages
                  .flatMap((p) => p.items)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            {catalog.hasNextPage && (
              <Button
                tone="light"
                disabled={catalog.isFetchingNextPage}
                variant="secondary"
                onClick={() => void catalog.fetchNextPage()}
              >
                Más profesionales
              </Button>
            )}
            {catalog.error && (
              <p role="alert">No pudimos cargar los profesionales. Vuelve a buscar.</p>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            {formatCalendarDate(from)}
            {length === 7 ? ' al ' + formatCalendarDate(addBusinessDays(to, -1)!) : ''}
          </p>
          <Button
            tone="light"
            variant="ghost"
            onClick={() => {
              setStatus('');
              setProfessional('');
              setSearch('');
              setCatalogSearch('');
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      </Card>
      {notice && (
        <p role="status" className="rounded-lg bg-[var(--dash-accent-soft)] p-3">
          {notice}
        </p>
      )}
      {pages.isPending && <p role="status">Cargando agenda…</p>}
      {pages.error && (
        <Card tone="light" className="space-y-3 p-4">
          <CalendarFailure
            key={pages.errorUpdatedAt}
            error={pages.error}
            onRetry={reload}
            label="Recargar agenda desde el inicio"
          />
        </Card>
      )}
      {!pages.error && !pages.isPending && !items.length && (
        <Card tone="light" className="p-5">
          <p role="status">
            {status || professional
              ? 'No hay citas con estos filtros. Limpia los filtros o consulta otro periodo.'
              : 'No hay citas en este periodo. Puedes consultar otra fecha.'}
          </p>
        </Card>
      )}
      {!pages.error && items.length > 0 && (
        <>
          <p className="text-sm text-[var(--dash-text-muted)]">
            {items.length} citas cargadas{pages.hasNextPage ? ' · hay más citas por consultar' : ''}
            .
          </p>
          <div className={mode === 'week' ? 'grid gap-3 xl:grid-cols-7' : 'grid gap-3'}>
            {days.map((date) => {
              const range = businessDayRange(date, pages.data!.pages[0].timeZone);
              const daily = range
                ? items.filter((b) => b.startTime < range.end && b.endTime > range.start)
                : [];
              return (
                <section
                  key={date}
                  className="min-w-0 space-y-2"
                  aria-label={formatCalendarDate(date)}
                >
                  <h2 className="rounded-lg bg-[var(--dash-surface-raised)] p-2 text-sm font-semibold">
                    {formatCalendarDate(date)}
                  </h2>
                  {!daily.length && (
                    <p className="p-2 text-sm text-[var(--dash-text-muted)]">Sin citas</p>
                  )}
                  {daily.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelected(b.id)}
                      className="w-full space-y-1 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3 text-left shadow-sm hover:border-[var(--dash-accent)] focus-visible:outline-2"
                    >
                      <p className="text-sm font-semibold">
                        <CalendarTime
                          value={b.startTime}
                          zone={pages.data!.pages[0].timeZone}
                          clock
                        />
                        {' – '}
                        <CalendarTime
                          value={b.endTime}
                          zone={pages.data!.pages[0].timeZone}
                          clock
                        />
                      </p>
                      {range && b.startTime < range.start && (
                        <p className="text-xs">Continúa de otro día</p>
                      )}
                      <p className="break-words font-semibold">{b.client.name}</p>
                      <p className="break-words text-sm">{b.service.name}</p>
                      <p className="break-words text-xs text-[var(--dash-text-muted)]">
                        {b.professional.name} · {calendarStatus[b.status]}
                      </p>
                      <span className="block text-xs text-[var(--dash-accent)]">Ver detalle</span>
                    </button>
                  ))}
                </section>
              );
            })}
          </div>
        </>
      )}
      {pages.hasNextPage && !pages.error && (
        <Button
          tone="light"
          variant="secondary"
          disabled={pages.isFetchingNextPage}
          onClick={() => void pages.fetchNextPage()}
        >
          {pages.isFetchingNextPage ? 'Cargando más citas…' : 'Cargar más citas'}
        </Button>
      )}
      {selected && !pages.error && (
        <CalendarDetail
          key={selected}
          id={selected}
          user={user}
          zone={pages.data?.pages[0].timeZone ?? zone}
          onClose={() => setSelected(null)}
          onMoved={() => {
            setSelected(null);
            setNotice(
              'Reserva reagendada. El profesional, el servicio y el estado se conservaron.',
            );
            void client.resetQueries({ queryKey: pageKey, exact: true });
            void client.invalidateQueries({ queryKey: ['bookings'] });
          }}
        />
      )}
    </div>
  );
}
