'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type Professional } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  clockLabel,
  closureError,
  scheduleError,
  weekError,
  WEEKDAY_LABELS,
  type BusinessSchedule,
  type ClosureInput,
  type ScheduleCommand,
  type ScheduleDay,
  type ScheduleImpact,
} from '@/lib/business-schedule';
import { formatBusinessInstant, formatCalendarDate } from '@/lib/business-time';
import {
  scheduleBase,
  useBusinessSchedule,
  useScheduleClosures,
  useScheduleRegions,
} from '@/lib/queries/business-schedule';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InputField, SelectField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

const focus =
  'min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dash-accent)]';
const denied = (error: unknown) => error instanceof ApiError && [401, 403].includes(error.status);
function Panel({ children }: { children: ReactNode }) {
  return (
    <Card tone="light" className="min-w-0 space-y-4 p-4 sm:p-5">
      {children}
    </Card>
  );
}
function Loading() {
  return (
    <div role="status">
      <p>Cargando horario…</p>
      <Skeleton className="mt-3 h-40 w-full" />
    </div>
  );
}

export function BusinessScheduleSettings() {
  const { user, organization, isReady } = useAuth();
  if (!isReady) return <Loading />;
  if (!user || !organization)
    return <p role="status">Actualiza tu acceso para consultar el horario.</p>;
  const scope = `${user.id}:${organization.id}:${user.role}`;
  return (
    <Workspace
      key={scope}
      scope={scope}
      owner={user.role === 'OWNER'}
      manages={['OWNER', 'ADMIN'].includes(user.role)}
    />
  );
}
function Workspace({ scope, owner, manages }: { scope: string; owner: boolean; manages: boolean }) {
  const [visit] = useState(() => crypto.randomUUID());
  const query = useBusinessSchedule(scope, visit);
  if (denied(query.error))
    return (
      <Panel>
        <p role="alert">{scheduleError(query.error)}</p>
        <Button tone="light" className={focus} onClick={() => window.location.reload()}>
          Actualizar mi acceso
        </Button>
      </Panel>
    );
  if (!query.data)
    return query.isPending ? (
      <Loading />
    ) : (
      <Panel>
        <p role="alert">No pudimos cargar el horario del negocio.</p>
        <Button
          tone="light"
          className={focus}
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Reintentar carga del horario
        </Button>
      </Panel>
    );
  return (
    <Editor
      scope={scope}
      visit={visit}
      query={query}
      initial={query.data}
      owner={owner}
      manages={manages}
    />
  );
}
function Editor({
  scope,
  visit,
  query,
  initial,
  owner,
  manages,
}: {
  scope: string;
  visit: string;
  query: ReturnType<typeof useBusinessSchedule>;
  initial: BusinessSchedule;
  owner: boolean;
  manages: boolean;
}) {
  const client = useQueryClient();
  const [base, setBase] = useState(initial);
  const [week, setWeek] = useState<ScheduleDay[]>(() => structuredClone(initial.week));
  const [regionId, setRegionId] = useState(initial.region?.id ?? '');
  const [closure, setClosure] = useState<ClosureInput>({
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '10:00',
    reason: '',
  });
  const [partial, setPartial] = useState(false);
  const [offset, setOffset] = useState(0);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [preview, setPreview] = useState<{
    command: ScheduleCommand;
    result: ScheduleImpact;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessLost, setAccessLost] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [success, setSuccess] = useState('');
  const [impactNames, setImpactNames] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<'save' | 'zone' | { cancelId: string } | null>(
    null,
  );
  const regions = useScheduleRegions(scope, visit);
  const closures = useScheduleClosures(scope, visit, offset, manages && includeCancelled);
  const lifetime = useRef<{ active: boolean; controller: AbortController }>({
    active: false,
    controller: new AbortController(),
  });
  const busy = useRef(false);
  useLayoutEffect(() => {
    const current = { active: true, controller: new AbortController() };
    lifetime.current = current;
    return () => {
      current.active = false;
      current.controller.abort();
    };
  }, []);
  const latest = query.data ?? base;
  const outdated = latest.revision !== base.revision;
  const dirty = JSON.stringify(week) !== JSON.stringify(base.week);
  const readFailed = query.isError || query.isFetching;
  const blocked = pending || outdated || readFailed || needsRefresh;
  const commandClosure: ClosureInput = {
    startDate: closure.startDate,
    endDate: partial ? closure.startDate : closure.endDate,
    startTime: partial ? closure.startTime : '00:00',
    endTime: partial ? closure.endTime : '24:00',
    ...(closure.reason?.trim() ? { reason: closure.reason.trim() } : {}),
  };
  const makeCommand = (kind: 'week' | 'closure'): ScheduleCommand =>
    kind === 'week'
      ? { kind, body: { expectedRevision: base.revision, week } }
      : { kind, body: { ...commandClosure, expectedRevision: base.revision } };
  const previewValid =
    preview &&
    JSON.stringify(preview.command) === JSON.stringify(makeCommand(preview.command.kind)) &&
    preview.result.revision === base.revision;

  async function run(work: (signal: AbortSignal) => Promise<void>, writes = false) {
    if (busy.current) return;
    const current = lifetime.current;
    busy.current = true;
    setPending(true);
    setError(null);
    setSuccess('');
    try {
      await work(current.controller.signal);
    } catch (failure) {
      if (current.active) {
        setError(scheduleError(failure));
        setAccessLost(denied(failure));
        setConfirmation(null);
        if (writes) {
          setNeedsRefresh(true);
          setPreview(null);
        }
      }
    } finally {
      if (current.active) {
        busy.current = false;
        setPending(false);
      }
    }
  }
  async function refreshed(signal: AbortSignal, preserveWeek = false) {
    // A fresh read is required after mutation; receipt alone is not a new editor model.
    const next = await api.get<BusinessSchedule>(scheduleBase, undefined, {
      signal,
      cache: 'no-store',
    });
    if (!lifetime.current.active || signal.aborted) return;
    client.setQueryData(['business-schedule', scope, visit, 'read'], next);
    setBase(next);
    if (!preserveWeek) setWeek(structuredClone(next.week));
    setRegionId(next.region?.id ?? '');
    setPreview(null);
    setConfirmation(null);
    setNeedsRefresh(false);
    // Refresh consumers that derive global rules. No cache receives an invented result.
    await Promise.all(
      [
        'business-schedule',
        'cms',
        'organizations',
        'bookings',
        'professionals',
        'analytics',
        'notifications',
        'media',
        'invoices',
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  }
  function review(kind: 'week' | 'closure', page = 0) {
    const command = makeCommand(kind);
    const invalid = kind === 'week' ? weekError(week) : closureError(commandClosure);
    if (invalid) {
      setError(invalid);
      return;
    }
    void run(async (signal) => {
      const result = await api.post<ScheduleImpact>(
        `${scheduleBase}/${kind === 'week' ? 'week' : 'closures'}/impact?offset=${page}&limit=20`,
        command.body,
        { signal, cache: 'no-store' },
      );
      const ids = [
        ...new Set([
          ...result.professionalEffects.items.map((p) => p.professionalId),
          ...result.conflicts.items.map((b) => b.professionalId),
        ]),
      ];
      const names = await Promise.all(
        ids.map(async (id) => {
          try {
            const professional = await api.get<Professional>(`/professionals/${id}`, undefined, {
              signal,
              cache: 'no-store',
            });
            return [id, professional.name] as const;
          } catch (failure) {
            if (denied(failure)) throw failure;
            return [id, 'Profesional no disponible en el directorio'] as const;
          }
        }),
      );
      if (!lifetime.current.active || signal.aborted) return;
      setImpactNames(Object.fromEntries(names));
      setPreview({ command, result });
    });
  }
  function save() {
    if (blocked || !previewValid || !preview || preview.result.conflictCount > 0) return;
    const command = preview.command;
    void run(async (signal) => {
      if (command.kind === 'week')
        await api.put(`${scheduleBase}/week`, command.body, { signal, cache: 'no-store' });
      else await api.post(`${scheduleBase}/closures`, command.body, { signal, cache: 'no-store' });
      if (!lifetime.current.active || signal.aborted) return;
      await refreshed(signal, command.kind === 'closure');
      if (!lifetime.current.active || signal.aborted) return;
      setSuccess(
        command.kind === 'week'
          ? 'Horario guardado. La disponibilidad usa esta semana.'
          : 'Cierre añadido. Las reservas existentes se conservaron.',
      );
      if (command.kind === 'closure')
        setClosure({
          startDate: '',
          endDate: '',
          startTime: '09:00',
          endTime: '10:00',
          reason: '',
        });
    }, true);
  }
  function confirmZone() {
    if (blocked || !regionId) return;
    void run(async (signal) => {
      await api.post(
        `${scheduleBase}/zone`,
        { expectedRevision: base.revision, regionId },
        { signal, cache: 'no-store' },
      );
      if (!lifetime.current.active || signal.aborted) return;
      await refreshed(signal, true);
      if (lifetime.current.active && !signal.aborted)
        setSuccess(base.state === 'CONFIRMED'
          ? 'Región confirmada. La semana vigente usa la hora del negocio.'
          : 'Región confirmada. Revisa y guarda la semana para confirmar el horario.');
    }, true);
  }
  function cancelClosure(id: string) {
    if (blocked) return;
    void run(async (signal) => {
      await api.post(
        `${scheduleBase}/closures/${id}/cancel`,
        { expectedRevision: base.revision },
        { signal, cache: 'no-store' },
      );
      if (!lifetime.current.active || signal.aborted) return;
      await refreshed(signal, true);
      if (lifetime.current.active && !signal.aborted)
        setSuccess('Cierre cancelado. Su historial se conserva.');
    }, true);
  }
  function editWeek(next: ScheduleDay[]) {
    setWeek(next);
    setPreview(null);
    setSuccess('');
  }
  function editClosure(next: ClosureInput) {
    setClosure(next);
    setPreview(null);
    setSuccess('');
  }
  if (accessLost || denied(closures.error) || denied(regions.error))
    return (
      <Panel>
        <p role="alert">Tu acceso cambió. Actualiza tu sesión para continuar.</p>
        <Button tone="light" onClick={() => window.location.reload()}>
          Actualizar mi acceso
        </Button>
      </Panel>
    );
  return (
    <section
      aria-labelledby="schedule-heading"
      className="min-w-0 space-y-5 text-[var(--dash-text)]"
    >
      <Panel>
        <div>
          <h2 id="schedule-heading" className="text-xl font-semibold">
            Horario y zona
          </h2>
          <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
            Reglas de atención del negocio. Se guardan sin publicar la página pública.
          </p>
        </div>
        <p role="status">
          {latest.state === 'CONFIRMED' ? 'Horario confirmado' : 'Horario sin confirmar'} ·{' '}
          {latest.region?.label ?? 'Región pendiente de selección'} · Hora del negocio
        </p>
        {latest.state === 'LEGACY_UNCONFIRMED' && (
          <p className="text-sm">
            Se conserva temporalmente la lectura del horario anterior. Las franjas mostradas son una
            propuesta; revísalas antes de confirmarlas.
          </p>
        )}
        {latest.state === 'UNCONFIRMED' && (
          <p className="text-sm">
            Este negocio aún no tiene un horario confirmado. Confirma la región y revisa los siete
            días antes de guardar.
          </p>
        )}
        {!latest.zoneConfirmed && (
          <p className="text-sm">
            El propietario debe confirmar la región antes de guardar la semana.
          </p>
        )}
        {manages && base.management?.legacyCategory === 'INVALID' && (
          <p role="alert">
            El horario anterior no pudo interpretarse. Revisa cada día; no representa una elección
            confirmada.
          </p>
        )}
        {manages && Boolean(base.management?.ignoredLegacyKeys.length) && (
          <p className="text-sm">
            El horario anterior contiene información adicional que no define franjas de atención.
          </p>
        )}
        {outdated && (
          <p role="alert">
            El horario cambió mientras lo editabas. Actualiza para revisar tu edición con los datos
            vigentes.
          </p>
        )}
        {query.isError && (
          <p role="alert">No pudimos comprobar el horario vigente. Reintenta antes de guardar.</p>
        )}
        {needsRefresh && (
          <p role="alert">
            Actualiza los datos para comprobar el resultado antes de otra acción. Conservamos tu
            edición.
          </p>
        )}
        {manages && (
          <Button
            tone="light"
            variant="secondary"
            className={focus}
            disabled={pending || query.isFetching}
            onClick={() =>
              void run(async (signal) => {
                const next = await api.get<BusinessSchedule>(scheduleBase, undefined, {
                  signal,
                  cache: 'no-store',
                });
                if (!lifetime.current.active || signal.aborted) return;
                client.setQueryData(['business-schedule', scope, visit, 'read'], next);
                setBase(next);
                setPreview(null);
                setConfirmation(null);
                setRegionId(next.region?.id ?? '');
                setNeedsRefresh(false);
                if (!dirty) setWeek(structuredClone(next.week));
                setSuccess('Datos actualizados. Revisa el impacto de tu edición antes de guardar.');
              })
            }
          >
            Actualizar conservando edición
          </Button>
        )}
        {!manages && query.isError && (
          <Button tone="light" onClick={() => void query.refetch()}>
            Reintentar horario
          </Button>
        )}
      </Panel>
      {error && (
        <p role="alert" className="rounded-sm border border-[var(--dash-danger)] p-3">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-sm border border-[var(--dash-border)] p-3">
          {success}
        </p>
      )}
      {pending && <p role="status">Procesando solicitud…</p>}
      {owner && (
        <Panel>
          <h3 className="font-semibold">Región del negocio</h3>
          {regions.isError ? (
            <>
              <p role="alert">No pudimos cargar las regiones.</p>
              <Button tone="light" onClick={() => void regions.refetch()}>
                Reintentar regiones
              </Button>
            </>
          ) : (
            <SelectField
              tone="light"
              label="Región"
              id="business-region"
              value={regionId}
              disabled={pending || regions.isPending}
              onChange={(e) => {
                setRegionId(e.target.value);
                setConfirmation(null);
              }}
            >
              <option value="">Selecciona una región</option>
              {regions.data?.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.label}
                </option>
              ))}
            </SelectField>
          )}
          {base.management && !base.management.zoneChangeAllowed && (
            <p className="text-sm">
              Existen compromisos o historial. Puedes confirmar la región actual; cambiarla requiere
              una revisión separada.
            </p>
          )}
          <Button
            tone="light"
            className={focus}
            disabled={
              blocked ||
              !regionId ||
              regions.isError ||
              regions.isPending ||
              (base.zoneConfirmed && regionId === base.region?.id) ||
              (!base.management?.zoneChangeAllowed && regionId !== base.region?.id)
            }
            onClick={() => setConfirmation('zone')}
          >
            Confirmar región
          </Button>
        </Panel>
      )}
      <Panel>
        <h3 className="font-semibold">Semana de atención</h3>
        <p className="text-sm text-[var(--dash-text-muted)]">
          Hasta cinco franjas por día. Un día sin franjas queda cerrado. Las franjas contiguas se
          unen al guardar.
        </p>
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          {(manages ? week : latest.week).map((day) => (
            <fieldset
              key={day.dayOfWeek}
              className="min-w-0 rounded-sm border border-[var(--dash-border)] p-3"
              disabled={pending}
            >
              <legend className="px-1 font-semibold">{WEEKDAY_LABELS[day.dayOfWeek]}</legend>
              {!day.windows.length && (
                <p className="text-sm">
                  {latest.state === 'UNCONFIRMED' && !manages ? 'Sin definir' : 'Cerrado'}
                </p>
              )}
              <div className="space-y-3">
                {day.windows.map((window, index) =>
                  manages ? (
                    <div
                      key={index}
                      className="space-y-2 border-b border-[var(--dash-border)] pb-3 last:border-0"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <InputField
                          tone="light"
                          type="time"
                          step={60}
                          label={`Desde · ${WEEKDAY_LABELS[day.dayOfWeek]} ${index + 1}`}
                          id={`week-${day.dayOfWeek}-${index}-start`}
                          value={window.startTime}
                          onChange={(e) =>
                            editWeek(
                              week.map((d) =>
                                d.dayOfWeek === day.dayOfWeek
                                  ? {
                                      ...d,
                                      windows: d.windows.map((w, i) =>
                                        i === index ? { ...w, startTime: e.target.value } : w,
                                      ),
                                    }
                                  : d,
                              ),
                            )
                          }
                        />
                        <InputField
                          tone="light"
                          type="time"
                          step={60}
                          label={`Hasta · ${WEEKDAY_LABELS[day.dayOfWeek]} ${index + 1}`}
                          id={`week-${day.dayOfWeek}-${index}-end`}
                          disabled={window.endTime === '24:00'}
                          value={window.endTime === '24:00' ? '' : window.endTime}
                          onChange={(e) =>
                            editWeek(
                              week.map((d) =>
                                d.dayOfWeek === day.dayOfWeek
                                  ? {
                                      ...d,
                                      windows: d.windows.map((w, i) =>
                                        i === index ? { ...w, endTime: e.target.value } : w,
                                      ),
                                    }
                                  : d,
                              ),
                            )
                          }
                        />
                      </div>
                      <label className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={window.endTime === '24:00'}
                          onChange={(e) =>
                            editWeek(
                              week.map((d) =>
                                d.dayOfWeek === day.dayOfWeek
                                  ? {
                                      ...d,
                                      windows: d.windows.map((w, i) =>
                                        i === index
                                          ? { ...w, endTime: e.target.checked ? '24:00' : '19:00' }
                                          : w,
                                      ),
                                    }
                                  : d,
                              ),
                            )
                          }
                        />
                        Hasta el final del día
                      </label>
                      <Button
                        tone="light"
                        variant="ghost"
                        className={focus}
                        aria-label={`Quitar franja ${index + 1} de ${WEEKDAY_LABELS[day.dayOfWeek]}`}
                        onClick={() =>
                          editWeek(
                            week.map((d) =>
                              d.dayOfWeek === day.dayOfWeek
                                ? { ...d, windows: d.windows.filter((_, i) => i !== index) }
                                : d,
                            ),
                          )
                        }
                      >
                        Quitar franja
                      </Button>
                    </div>
                  ) : (
                    <p key={index} className="text-sm">
                      De {clockLabel(window.startTime)} a {clockLabel(window.endTime)}
                    </p>
                  ),
                )}
              </div>
              {manages && (
                <Button
                  tone="light"
                  variant="secondary"
                  className={`${focus} mt-2`}
                  disabled={day.windows.length >= 5}
                  aria-label={`Añadir franja a ${WEEKDAY_LABELS[day.dayOfWeek]}`}
                  onClick={() =>
                    editWeek(
                      week.map((d) =>
                        d.dayOfWeek === day.dayOfWeek
                          ? {
                              ...d,
                              windows: [...d.windows, { startTime: '09:00', endTime: '19:00' }],
                            }
                          : d,
                      ),
                    )
                  }
                >
                  Añadir franja
                </Button>
              )}
            </fieldset>
          ))}
        </div>
        {manages && (
          <div className="flex flex-wrap gap-2">
            <Button
              tone="light"
              variant="secondary"
              className={focus}
              disabled={blocked || !base.zoneConfirmed}
              onClick={() => review('week')}
            >
              Revisar impacto de semana
            </Button>
            <Button
              tone="light"
              variant="ghost"
              className={focus}
              disabled={pending || !dirty}
              onClick={() => {
                editWeek(structuredClone(base.week));
                setError(null);
              }}
            >
              Descartar edición de semana
            </Button>
          </div>
        )}
      </Panel>
      {manages && (
        <Panel>
          <h3 className="font-semibold">Añadir cierre</h3>
          <p className="text-sm">
            Los cierres reducen la atención. No cancelan ni reprograman citas.
          </p>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={partial}
              disabled={pending}
              onChange={(e) => {
                setPartial(e.target.checked);
                setPreview(null);
              }}
            />
            Cerrar solo parte del día
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              tone="light"
              label={partial ? 'Fecha del cierre' : 'Desde la fecha'}
              id="closure-start-date"
              type="date"
              max="9999-12-30"
              disabled={pending}
              value={closure.startDate}
              onChange={(e) => editClosure({ ...closure, startDate: e.target.value })}
            />
            {!partial && (
              <InputField
                tone="light"
                label="Hasta la fecha · incluida"
                id="closure-end-date"
                type="date"
                max="9999-12-30"
                disabled={pending}
                value={closure.endDate}
                onChange={(e) => editClosure({ ...closure, endDate: e.target.value })}
              />
            )}
          </div>
          {partial && (
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                tone="light"
                type="time"
                step={60}
                label="Inicio del cierre"
                id="closure-start-time"
                disabled={pending}
                value={closure.startTime}
                onChange={(e) => editClosure({ ...closure, startTime: e.target.value })}
              />
              <div>
                <InputField
                  tone="light"
                  type="time"
                  step={60}
                  label="Fin del cierre"
                  id="closure-end-time"
                  disabled={pending || closure.endTime === '24:00'}
                  value={closure.endTime === '24:00' ? '' : closure.endTime}
                  onChange={(e) => editClosure({ ...closure, endTime: e.target.value })}
                />
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={closure.endTime === '24:00'}
                    disabled={pending}
                    onChange={(e) =>
                      editClosure({ ...closure, endTime: e.target.checked ? '24:00' : '10:00' })
                    }
                  />
                  Hasta el final del día
                </label>
              </div>
            </div>
          )}
          <InputField
            tone="light"
            label="Motivo privado · opcional, hasta 500 caracteres"
            id="closure-reason"
            maxLength={500}
            disabled={pending}
            value={closure.reason ?? ''}
            onChange={(e) => editClosure({ ...closure, reason: e.target.value })}
          />
          <p className="text-xs text-[var(--dash-text-muted)]">
            Solo el propietario y administradores ven el motivo.
          </p>
          <Button
            tone="light"
            className={focus}
            variant="secondary"
            disabled={blocked || base.state !== 'CONFIRMED'}
            onClick={() => review('closure')}
          >
            Revisar impacto del cierre
          </Button>
          {base.state !== 'CONFIRMED' && (
            <p className="text-sm">Confirma el horario antes de añadir cierres.</p>
          )}
        </Panel>
      )}
      {previewValid && preview && (
        <Panel>
          <h3 className="font-semibold">
            Revisión de impacto · {preview.command.kind === 'week' ? 'semana' : 'cierre'}
          </h3>
          <p role="status">
            {preview.result.protectedBookingCount} citas futuras o en curso evaluadas ·{' '}
            {preview.result.conflictCount} citas afectadas
          </p>
          <p className="text-sm">
            Esta revisión es informativa. Al guardar se vuelven a comprobar todas las citas.
          </p>
          {preview.result.conflictCount > 0 && (
            <>
              <p role="alert">
                Este cambio afectaría citas que ya tienes. Revísalas antes de guardar.
              </p>
              <Link href="/dashboard/bookings" className="underline">
                Revisar agenda
              </Link>
            </>
          )}
          <ul className="space-y-2 text-sm">
            {preview.result.conflicts.items.map((b) => (
              <li key={b.id}>
                {impactNames[b.professionalId]} ·{' '}
                {formatBusinessInstant(b.startTime, base.timeZone)} —{' '}
                {formatBusinessInstant(b.endTime, base.timeZone)}
              </li>
            ))}
          </ul>
          <p className="text-sm">
            {preview.result.professionalEffects.total} profesionales con cambios en sus reglas de
            disponibilidad (
            {preview.result.professionalEffects.basis === 'RECURRING_WEEK'
              ? 'semana recurrente'
              : 'fechas del cierre'}
            ). Los minutos describen reglas de atención; no son un pronóstico de citas libres.
          </p>
          <ul className="space-y-2 text-sm">
            {preview.result.professionalEffects.items.map((p) => (
              <li key={p.professionalId}>
                {impactNames[p.professionalId]}: {p.gainedMinutes} minutos añadidos, {p.lostMinutes}{' '}
                minutos retirados.
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              tone="light"
              variant="secondary"
              className={focus}
              disabled={blocked || preview.result.conflicts.offset === 0}
              onClick={() =>
                review(preview.command.kind, Math.max(0, preview.result.conflicts.offset - 20))
              }
            >
              Impacto anterior
            </Button>
            <span className="text-sm">
              Página {Math.floor(preview.result.conflicts.offset / 20) + 1}
            </span>
            <Button
              tone="light"
              variant="secondary"
              className={focus}
              disabled={
                blocked ||
                preview.result.conflicts.offset + 20 >=
                  Math.max(preview.result.conflicts.total, preview.result.professionalEffects.total)
              }
              onClick={() => review(preview.command.kind, preview.result.conflicts.offset + 20)}
            >
              Impacto siguiente
            </Button>
          </div>
          <Button
            tone="light"
            className={focus}
            disabled={blocked || preview.result.conflictCount > 0}
            onClick={() => setConfirmation('save')}
          >
            {preview.command.kind === 'week' ? 'Guardar semana revisada' : 'Añadir cierre revisado'}
          </Button>
        </Panel>
      )}
      <Panel>
        <h3 className="font-semibold">Cierres del negocio</h3>
        {manages && (
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={includeCancelled}
              disabled={pending}
              onChange={(e) => {
                setIncludeCancelled(e.target.checked);
                setOffset(0);
              }}
            />
            Incluir cierres cancelados
          </label>
        )}
        {closures.isPending ? (
          <p role="status">Cargando cierres…</p>
        ) : closures.isError ? (
          <>
            <p role="alert">No pudimos cargar los cierres.</p>
            <Button tone="light" onClick={() => void closures.refetch()}>
              Reintentar cierres
            </Button>
          </>
        ) : (
          <>
            {!closures.data?.items.length && <p>No hay cierres en esta vista.</p>}
            <ul className="space-y-3">
              {closures.data?.items.map((c) => (
                <li
                  key={c.id}
                  className="space-y-2 rounded-sm border border-[var(--dash-border)] p-3"
                >
                  <p className="text-sm font-medium">
                    {formatCalendarDate(c.startDate)}
                    {c.endDate !== c.startDate
                      ? ` al ${formatCalendarDate(c.endDate)}, ambas fechas incluidas`
                      : ''}{' '}
                    ·{' '}
                    {c.startTime === '00:00' && c.endTime === '24:00'
                      ? 'Día completo'
                      : `${clockLabel(c.startTime)} a ${clockLabel(c.endTime)}`}
                  </p>
                  <p className="text-sm">{c.status === 'ACTIVE' ? 'Activo' : 'Cancelado'}</p>
                  {manages && c.reason && (
                    <p className="whitespace-pre-wrap break-words text-sm">
                      Motivo privado: {c.reason}
                    </p>
                  )}
                  {manages && c.status === 'ACTIVE' && (
                    <Button
                      tone="light"
                      variant="danger"
                      className={focus}
                      disabled={blocked}
                      onClick={() => setConfirmation({ cancelId: c.id })}
                    >
                      Cancelar cierre
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                tone="light"
                variant="secondary"
                className={focus}
                disabled={pending || offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 20))}
              >
                Cierres anteriores
              </Button>
              <span className="text-sm">
                {closures.data?.total ?? 0} cierres · página {Math.floor(offset / 20) + 1}
              </span>
              <Button
                tone="light"
                variant="secondary"
                className={focus}
                disabled={pending || offset + 20 >= (closures.data?.total ?? 0)}
                onClick={() => setOffset(offset + 20)}
              >
                Cierres siguientes
              </Button>
            </div>
          </>
        )}
      </Panel>
      {confirmation && (
        <Modal
          tone="light"
          title={
            confirmation === 'zone'
              ? 'Confirmar región del negocio'
              : confirmation === 'save'
                ? 'Aplicar horario revisado'
                : 'Cancelar cierre'
          }
          onClose={() => {
            if (!pending) setConfirmation(null);
          }}
        >
          <p className="mb-4 text-sm">
            {confirmation === 'zone'
              ? `Se usará la hora de ${regions.data?.find((r) => r.id === regionId)?.label ?? 'la región seleccionada'}. No se moverán citas ni contenidos existentes.`
              : confirmation === 'save'
                ? 'Se aplicarán las reglas revisadas a la disponibilidad. No se publica la página ni se envían correos.'
                : 'El cierre dejará de reducir la atención. Su historial se conserva; las citas no se mueven.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              tone="light"
              className={focus}
              disabled={blocked || (confirmation === 'save' && !previewValid)}
              onClick={() =>
                confirmation === 'zone'
                  ? confirmZone()
                  : confirmation === 'save'
                    ? save()
                    : cancelClosure(confirmation.cancelId)
              }
            >
              Confirmar acción
            </Button>
            <Button
              tone="light"
              variant="secondary"
              className={focus}
              disabled={pending}
              onClick={() => setConfirmation(null)}
            >
              Volver a revisar
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
