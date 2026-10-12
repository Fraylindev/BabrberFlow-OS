'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@/lib/api';
import { ApiError } from '@/lib/api';
import {
  addBusinessDays,
  businessDate,
  calendarApi,
  calendarError,
  calendarScope,
  calendarRetryUntil,
  calendarStatus,
  canMoveCalendar,
  formatCalendarDate,
  formatBusinessTime,
} from '@/lib/calendar';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CalendarTime } from './CalendarTime';
export function CalendarDetail({
  id,
  user,
  zone,
  onClose,
  onMoved,
  initialEdit = false,
}: {
  id: string;
  user: AuthUser;
  zone: string;
  onClose: () => void;
  onMoved: () => void;
  initialEdit?: boolean;
}) {
  const client = useQueryClient();
  const [visit] = useState(() => crypto.randomUUID());
  const scope = calendarScope(user);
  const prefix = ['m3-detail', scope, visit, id];
  const life = useRef({ active: false, abort: new AbortController() });
  useLayoutEffect(() => {
    const current = { active: true, abort: new AbortController() };
    life.current = current;
    return () => {
      current.active = false;
      current.abort.abort();
      void client.cancelQueries({ queryKey: ['m3-detail', scope, visit] });
      client.removeQueries({ queryKey: ['m3-detail', scope, visit] });
    };
  }, [client, scope, visit]);
  const detail = useQuery({
    queryKey: [...prefix, 'detail'],
    queryFn: ({ signal }) => calendarApi.detail(id, signal),
    staleTime: Infinity,
    gcTime: 300000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [editing, setEditing] = useState(initialEdit),
    [date, setDate] = useState(''),
    [selected, setSelected] = useState(''),
    [saving, setSaving] = useState(false),
    [error, setError] = useState<unknown>(null),
    [mustReview, setMustReview] = useState(false);
  const [firstDay, setFirstDay] = useState(() => businessDate(new Date(), zone));
  const lastDay = addBusinessDays(firstDay, 30)!;
  const [waitUntil, setWaitUntil] = useState(0),
    [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!waitUntil) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waitUntil]);
  const waiting = waitUntil > now;
  async function budget<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        const until = calendarRetryUntil(e.retryAfterSeconds ?? 60);
        setWaitUntil(until);
        setNow(until - (e.retryAfterSeconds ?? 60) * 1000);
      }
      throw e;
    }
  }
  const allowed =
    canMoveCalendar(user.role) &&
    Boolean(detail.data && ['PENDING', 'CONFIRMED'].includes(detail.data.status));
  const days = useQuery({
    queryKey: [...prefix, 'days', detail.data?.revision, firstDay],
    queryFn: ({ signal }) => budget(() => calendarApi.days(id, firstDay, lastDay, signal)),
    enabled: editing && allowed && !mustReview,
    staleTime: Infinity,
    gcTime: 300000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const slots = useQuery({
    queryKey: [...prefix, 'slots', detail.data?.revision, date],
    queryFn: ({ signal }) => budget(() => calendarApi.slots(id, date, signal)),
    enabled: editing && allowed && !!date && !mustReview,
    staleTime: Infinity,
    gcTime: 300000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const coherent = Boolean(
    detail.data &&
    days.data &&
    slots.data &&
    detail.data.revision === days.data.revision &&
    detail.data.revision === slots.data.revision,
  );
  async function review() {
    setSelected('');
    setDate('');
    setError(null);
    setMustReview(false);
    client.removeQueries({ queryKey: [...prefix, 'days'] });
    client.removeQueries({ queryKey: [...prefix, 'slots'] });
    await detail.refetch();
  }
  async function save() {
    if (saving || waiting || !selected || !slots.data || !coherent) return;
    const current = life.current;
    if (!current.active) return;
    setSaving(true);
    setError(null);
    try {
      await budget(() =>
        calendarApi.move(
          id,
          {
            startTime: selected,
            expectedUpdatedAt: slots.data!.updatedAt,
            expectedRevision: slots.data!.revision,
          },
          current.abort.signal,
        ),
      );
      if (current.active) onMoved();
    } catch (e) {
      if (!current.active) return;
      setError(e);
      setSelected('');
      if (!(e instanceof ApiError) || [401, 403, 404, 409, 503].includes(e.status)) {
        setMustReview(true);
        setDate('');
      }
    } finally {
      if (current.active) setSaving(false);
    }
  }
  const failure = error ?? detail.error ?? (editing ? (days.error ?? slots.error) : null);
  return (
    <Modal title="Detalle de la reserva" tone="light" size="lg" onClose={onClose}>
      <div className="space-y-4 text-[var(--dash-text)]">
        {detail.isPending && <p role="status">Cargando la reserva…</p>}
        {failure && (
          <div role="alert" className="space-y-2 rounded-lg bg-[var(--dash-danger-bg)] p-3">
            <p>{calendarError(failure)}</p>
            {failure instanceof ApiError && failure.status === 401 && (
              <Link href="/login" className="underline">
                Volver a iniciar sesión
              </Link>
            )}
            {waiting && (
              <p role="status">
                Podrás continuar en {Math.max(0, Math.ceil((waitUntil - now) / 1000))} segundos.
              </p>
            )}
            <Button
              tone="light"
              variant="secondary"
              disabled={saving || waiting}
              onClick={() => void review()}
            >
              Revisar reserva
            </Button>
          </div>
        )}
        {detail.data &&
          !detail.error &&
          !(failure instanceof ApiError && [401, 403, 404].includes(failure.status)) && (
            <>
              <dl className="grid gap-3 rounded-xl border border-[var(--dash-border)] p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-[var(--dash-text-muted)]">Cliente</dt>
                  <dd className="break-words font-semibold">{detail.data.client.name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--dash-text-muted)]">Estado</dt>
                  <dd>{calendarStatus[detail.data.status]}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--dash-text-muted)]">Profesional</dt>
                  <dd>{detail.data.professional.name}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--dash-text-muted)]">Servicio</dt>
                  <dd>{detail.data.service.name}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm text-[var(--dash-text-muted)]">
                    Horario actual · hora del negocio
                  </dt>
                  <dd>
                    <CalendarTime value={detail.data.startTime} zone={zone} />
                    {' – '}
                    <CalendarTime value={detail.data.endTime} zone={zone} clock />
                  </dd>
                </div>
              </dl>
              {allowed && !editing && (
                <Button tone="light" onClick={() => setEditing(true)}>
                  Reagendar
                </Button>
              )}
              {!allowed && (
                <p className="text-sm text-[var(--dash-text-muted)]">
                  {canMoveCalendar(user.role)
                    ? 'Esta reserva no admite cambios de fecha.'
                    : 'Puedes consultar tu reserva. El negocio gestiona los cambios de fecha.'}
                </p>
              )}
              {editing && allowed && !mustReview && (
                <section className="space-y-4" aria-label="Elegir nuevo horario">
                  <p className="text-sm">
                    Elige otra fecha y una hora disponible. Se mantienen el profesional y el
                    servicio.
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-sm">
                      Consultar desde
                      <input
                        className="mt-1 block rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)] p-2 text-base"
                        type="date"
                        value={firstDay}
                        min={businessDate(new Date(), zone)}
                        onChange={(e) => {
                          if (e.target.value && addBusinessDays(e.target.value, 30)) {
                            setFirstDay(e.target.value);
                            setDate('');
                            setSelected('');
                          }
                        }}
                        disabled={saving || waiting}
                      />
                    </label>
                    <span className="text-sm">Hasta {formatCalendarDate(lastDay)}</span>
                  </div>
                  {days.isPending && <p role="status">Buscando días disponibles…</p>}
                  {days.data && (
                    <div
                      className="grid grid-cols-3 gap-2 sm:grid-cols-5"
                      aria-label="Días disponibles"
                    >
                      {days.data.availableDates.map((value) => (
                        <button
                          key={value}
                          type="button"
                          className="rounded-lg border border-[var(--dash-border)] p-2 text-sm aria-pressed:bg-[var(--dash-accent-soft)] focus-visible:outline-2"
                          aria-label={
                            formatBusinessTime(value, undefined, { kind: 'date', relative: false })
                              .fullText
                          }
                          aria-pressed={date === value}
                          disabled={saving || waiting}
                          onClick={() => {
                            setDate(value);
                            setSelected('');
                          }}
                        >
                          {formatCalendarDate(value)}
                        </button>
                      ))}
                    </div>
                  )}
                  {days.data && !days.data.availableDates.length && (
                    <p role="status">
                      No hay días disponibles en este rango. Consulta otras fechas.
                    </p>
                  )}
                  {date && (
                    <div className="space-y-3">
                      <h3 className="font-semibold">Horarios del {formatCalendarDate(date)}</h3>
                      {slots.isPending && <p role="status">Cargando horarios…</p>}
                      {slots.data && coherent && (
                        <div
                          className="grid grid-cols-2 gap-2 sm:grid-cols-5"
                          aria-label="Horarios disponibles"
                        >
                          {slots.data.slots.map((slot) => (
                            <button
                              key={slot.startTime}
                              type="button"
                              className="rounded-lg border border-[var(--dash-border)] p-3 whitespace-nowrap aria-pressed:bg-[var(--dash-accent-soft)] focus-visible:outline-2"
                              aria-pressed={selected === slot.startTime}
                              disabled={
                                saving ||
                                waiting ||
                                Date.parse(slot.startTime) === Date.parse(detail.data!.startTime)
                              }
                              onClick={() => setSelected(slot.startTime)}
                            >
                              <CalendarTime
                                value={slot.startTime}
                                zone={slots.data!.timeZone}
                                clock
                              />
                            </button>
                          ))}
                        </div>
                      )}
                      {slots.data && !coherent && (
                        <div role="alert">
                          <p>La reserva cambió mientras consultabas los horarios.</p>
                          <Button tone="light" onClick={() => void review()}>
                            Revisar reserva
                          </Button>
                        </div>
                      )}
                      {slots.data && coherent && !slots.data.slots.length && (
                        <p role="status">No quedan horas disponibles. Elige otro día.</p>
                      )}
                    </div>
                  )}
                  {selected && slots.data && coherent && (
                    <div className="rounded-lg bg-[var(--dash-accent-soft)] p-3" role="status">
                      Nuevo horario: <CalendarTime value={selected} zone={slots.data.timeZone} />.
                      Se conserva el estado {calendarStatus[detail.data.status].toLowerCase()}.
                    </div>
                  )}
                  <Button
                    tone="light"
                    onClick={() => void save()}
                    disabled={saving || waiting || !selected || !coherent}
                  >
                    {saving ? 'Guardando cambio…' : 'Confirmar nuevo horario'}
                  </Button>
                </section>
              )}
            </>
          )}
        <Button tone="light" variant="ghost" onClick={onClose}>
          Cerrar detalle
        </Button>
      </div>
    </Modal>
  );
}
