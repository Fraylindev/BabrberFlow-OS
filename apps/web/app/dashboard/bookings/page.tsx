'use client';

import { useState, FormEvent, type ReactNode } from 'react';
import {
  ApiError,
  Booking,
  BookingFilters,
  BookingStatus,
  RescheduleBookingInput,
} from '@/lib/api';
import {
  useBookingsQuery,
  useCreateBooking,
  useUpdateBookingStatus,
  useRescheduleBooking,
} from '@/lib/queries/bookings';
import { useProfessionalsQuery } from '@/lib/queries/professionals';
import { useServicesQuery } from '@/lib/queries/services';
import { useClientsQuery } from '@/lib/queries/clients';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { SelectField } from '@/components/ui/Field';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonListRows } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth-context';
import { ClientAutocomplete } from '@/components/booking/ClientAutocomplete';
import { BookingActions } from '@/components/booking/BookingActions';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-DO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Devuelve un string "YYYY-MM-DD" en hora local (no UTC) para inputs type=date */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toLocalBoundaryISOString(dateString: string, endOfDay = false) {
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  ).toISOString();
}

function getInitials(name?: string) {
  if (!name) return '—';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function BookingFormSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface-raised)]/70 p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--dash-accent-soft)] text-xs font-bold text-[var(--dash-accent)]"
        >
          {step}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-[var(--dash-text)]">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-[var(--dash-text-muted)]">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

// ─── Etiquetas de filtro de estado ───────────────────────────────────────────
const STATUS_LABELS: Record<BookingStatus | 'ALL', string> = {
  ALL: 'Todos',
  PENDING: 'Pendientes',
  CONFIRMED: 'Confirmadas',
  COMPLETED: 'Completadas',
  CANCELLED: 'Canceladas',
  NO_SHOW: 'No asistió',
};

// ─── Página principal ─────────────────────────────────────────────────────────
export default function BookingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isBarber = user?.role === 'BARBER';

  // ── Filtros ──────────────────────────────────────────────────────────────
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const [fromDate, setFromDate] = useState(toLocalDateString(monday));
  const [toDate, setToDate] = useState(toLocalDateString(sunday));
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');

  const filters: BookingFilters = {
    from: fromDate ? toLocalBoundaryISOString(fromDate) : undefined,
    to: toDate ? toLocalBoundaryISOString(toDate, true) : undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  };

  // ── Datos ────────────────────────────────────────────────────────────────
  const { data: items, isLoading, isError, refetch } = useBookingsQuery(filters);

  // ── Mutaciones ───────────────────────────────────────────────────────────
  const updateStatus = useUpdateBookingStatus();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleStatusChange(id: string, status: BookingStatus) {
    setUpdatingId(id);
    try {
      await updateStatus.mutateAsync({ id, status });
      toast('Estado de la reserva actualizado.', 'success');
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : 'No se pudo actualizar el estado.',
        'error',
      );
    } finally {
      setUpdatingId(null);
    }
  }

  // ── Modales ──────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);

  // ── Agenda ordenada cronológicamente dentro del rango ────────────────────
  const sorted = items ? [...items].sort((a, b) => a.startTime.localeCompare(b.startTime)) : [];

  // ── ¿Hay filtros activos distintos a los por defecto? ────────────────────
  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    fromDate !== toLocalDateString(monday) ||
    toDate !== toLocalDateString(sunday);

  function clearFilters() {
    setFromDate(toLocalDateString(monday));
    setToDate(toLocalDateString(sunday));
    setStatusFilter('ALL');
  }

  return (
    <div>
      <PageHeader
        tone="light"
        title={isBarber ? 'Mi agenda' : 'Reservas'}
        description={
          isBarber ? 'Tus citas, no las de todo el equipo.' : 'Agenda de citas de tu barbería.'
        }
        action={
          <Button
            tone="light"
            className="min-h-11 w-full shadow-sm sm:w-auto"
            onClick={() => setCreateOpen(true)}
          >
            + Nueva reserva
          </Button>
        }
      />

      {/* ── Barra de filtros ─────────────────────────────────────────────── */}
      <Card tone="light" className="mb-5 overflow-hidden rounded-xl">
        <div className="border-b border-[var(--dash-border)] bg-[var(--dash-surface-raised)]/70 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
            Vista de agenda
          </p>
        </div>
        <div className="grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label
              htmlFor="filter-from"
              className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]"
            >
              Desde
            </label>
            <input
              id="filter-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate || undefined}
              className="min-h-10 w-full rounded-lg border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] px-3 py-2 text-sm text-[var(--dash-text)] outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--dash-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent-soft)]"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <label
              htmlFor="filter-to"
              className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]"
            >
              Hasta
            </label>
            <input
              id="filter-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate || undefined}
              className="min-h-10 w-full rounded-lg border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] px-3 py-2 text-sm text-[var(--dash-text)] outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--dash-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent-soft)]"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
            <label
              htmlFor="filter-status"
              className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]"
            >
              Estado
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'ALL')}
              className="min-h-10 w-full rounded-lg border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] px-3 py-2 text-sm text-[var(--dash-text)] outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--dash-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent-soft)]"
            >
              {(Object.keys(STATUS_LABELS) as (BookingStatus | 'ALL')[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <Button
              tone="light"
              variant="ghost"
              className="min-h-10 w-full self-end text-xs sm:w-auto"
              onClick={clearFilters}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </Card>

      {/* ── Error de red ─────────────────────────────────────────────────── */}
      {isError && (
        <div className="mb-4 flex items-center justify-between rounded-sm border border-[var(--dash-danger)]/30 bg-[var(--dash-danger-bg)] px-4 py-3">
          <p className="text-sm text-[var(--dash-danger)]">No pudimos cargar las reservas.</p>
          <Button tone="light" variant="ghost" className="text-xs" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {/* ── Cargando ─────────────────────────────────────────────────────── */}
      {isLoading && (
        <Card tone="light">
          <SkeletonListRows rows={5} tone="light" />
        </Card>
      )}

      {/* ── Sin resultados en el rango consultado ────────────────────────── */}
      {!isLoading && !isError && sorted.length === 0 && (
        <EmptyState
          tone="light"
          title="Sin reservas en este rango"
          description={
            hasActiveFilters
              ? 'Prueba restableciendo las fechas o el estado del filtro.'
              : 'Crea una reserva o consulta otro rango de fechas.'
          }
          action={
            hasActiveFilters ? (
              <Button tone="light" variant="secondary" onClick={clearFilters}>
                Restablecer filtros
              </Button>
            ) : (
              <Button tone="light" onClick={() => setCreateOpen(true)}>
                + Nueva reserva
              </Button>
            )
          }
        />
      )}

      {/* ── Listado de reservas ────────────────────────────────────────────── */}
      {!isLoading && !isError && sorted.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-card)]">
          {/* Vista móvil (Cards) */}
          <div className="grid grid-cols-1 gap-3 bg-[var(--dash-surface-raised)]/60 p-3 lg:hidden">
            {sorted.map((b) => (
              <article
                key={b.id}
                className="flex min-w-0 flex-col gap-4 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 shadow-sm"
              >
                {/* Header de la card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold capitalize text-[var(--dash-text)]">
                      {formatDateTime(b.startTime)}
                    </p>
                    <p className="text-xs text-[var(--dash-text-muted)]">
                      hasta {formatTimeOnly(b.endTime)}
                    </p>
                  </div>
                  <Badge status={b.status} tone="light" />
                </div>

                {/* Body de la card */}
                <div className="grid grid-cols-1 gap-3 text-sm min-[360px]:grid-cols-2">
                  <div className="flex min-w-0 items-center gap-2.5 min-[360px]:col-span-2">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--dash-accent-soft)] text-[10px] font-bold text-[var(--dash-accent)]"
                    >
                      {getInitials(b.client?.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                        Cliente
                      </p>
                      <p className="truncate font-medium text-[var(--dash-text)]">
                        {b.client?.name ?? '—'}
                      </p>
                      {b.client?.phone && (
                        <p className="truncate text-xs text-[var(--dash-text-muted)]">
                          {b.client.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 rounded-lg bg-[var(--dash-surface-raised)] px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                      Servicio
                    </p>
                    <p className="truncate font-medium text-[var(--dash-text)]">
                      {b.service?.name ?? '—'}
                    </p>
                    {b.service?.duration && (
                      <p className="text-xs text-[var(--dash-text-muted)]">
                        {b.service.duration} min
                      </p>
                    )}
                  </div>
                  <div className="min-w-0 rounded-lg bg-[var(--dash-surface-raised)] px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                      Profesional
                    </p>
                    <p className="truncate font-medium text-[var(--dash-text)]">
                      {b.professional?.name ?? '—'}
                    </p>
                  </div>
                </div>

                {/* Acciones de la card */}
                <BookingActions
                  booking={b}
                  isBarber={isBarber}
                  isUpdating={updatingId === b.id}
                  layout="mobile"
                  onStatusChange={(status) => handleStatusChange(b.id, status)}
                  onReschedule={() => setRescheduleTarget(b)}
                />
              </article>
            ))}
          </div>

          {/* Vista desktop (Tabla) */}
          <div className="hidden lg:block">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[14%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead className="border-b border-[var(--dash-border)] bg-[var(--dash-surface-raised)]">
                <tr>
                  {['Fecha / hora', 'Cliente', 'Profesional', 'Servicio', 'Estado', 'Acciones'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-3 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[var(--dash-text-muted)] xl:px-4"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--dash-border)]">
                {sorted.map((b) => (
                  <tr
                    key={b.id}
                    className="transition-colors duration-150 hover:bg-[var(--dash-surface-raised)]"
                  >
                    <td className="overflow-hidden px-3 py-3 xl:px-4">
                      <p
                        title={formatDateTime(b.startTime)}
                        className="truncate font-medium text-[var(--dash-text)]"
                      >
                        {formatDateTime(b.startTime)}
                      </p>
                      <p className="truncate text-xs text-[var(--dash-text-muted)]">
                        hasta {formatTimeOnly(b.endTime)}
                      </p>
                    </td>
                    <td className="overflow-hidden px-3 py-3 xl:px-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--dash-accent-soft)] text-[10px] font-bold text-[var(--dash-accent)]"
                        >
                          {getInitials(b.client?.name)}
                        </span>
                        <div className="min-w-0">
                          <p
                            title={b.client?.name}
                            className="truncate font-medium text-[var(--dash-text)]"
                          >
                            {b.client?.name ?? '—'}
                          </p>
                          {b.client?.phone && (
                            <p className="truncate text-xs text-[var(--dash-text-muted)]">
                              {b.client.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="overflow-hidden px-3 py-3 xl:px-4">
                      <p title={b.professional?.name} className="truncate text-[var(--dash-text)]">
                        {b.professional?.name ?? '—'}
                      </p>
                    </td>
                    <td className="overflow-hidden px-3 py-3 xl:px-4">
                      <p title={b.service?.name} className="truncate text-[var(--dash-text)]">
                        {b.service?.name ?? '—'}
                      </p>
                      {b.service?.duration && (
                        <p className="text-xs text-[var(--dash-text-muted)]">
                          {b.service.duration} min
                        </p>
                      )}
                    </td>
                    <td className="overflow-hidden px-2 py-3 xl:px-4">
                      <Badge status={b.status} tone="light" />
                    </td>
                    <td className="px-2 py-3 xl:px-4">
                      <BookingActions
                        booking={b}
                        isBarber={isBarber}
                        isUpdating={updatingId === b.id}
                        layout="table"
                        onStatusChange={(status) => handleStatusChange(b.id, status)}
                        onReschedule={() => setRescheduleTarget(b)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Contador de resultados */}
          <div className="border-t border-[var(--dash-border)] px-4 py-2.5">
            <p className="text-xs text-[var(--dash-text-muted)]">
              {sorted.length} reserva{sorted.length !== 1 ? 's' : ''} en el rango seleccionado
            </p>
          </div>
        </div>
      )}

      {/* ── Modal: crear reserva ─────────────────────────────────────────── */}
      {createOpen && (
        <CreateBookingModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            toast('Reserva creada.', 'success');
          }}
        />
      )}

      {/* ── Modal: reprogramar reserva ───────────────────────────────────── */}
      {rescheduleTarget && (
        <RescheduleBookingModal
          booking={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onRescheduled={() => {
            setRescheduleTarget(null);
            toast('Reserva reprogramada.', 'success');
          }}
        />
      )}
    </div>
  );
}

// ─── Modal: crear reserva ─────────────────────────────────────────────────────
function CreateBookingModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const {
    data: clients = [],
    isLoading: loadingClients,
    isError: clientsError,
    refetch: refetchClients,
  } = useClientsQuery();
  const {
    data: professionals = [],
    isLoading: loadingProfessionals,
    isError: professionalsError,
    refetch: refetchProfessionals,
  } = useProfessionalsQuery();
  const {
    data: services = [],
    isLoading: loadingServices,
    isError: servicesError,
    refetch: refetchServices,
  } = useServicesQuery();
  const createBooking = useCreateBooking();

  const [clientId, setClientId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadingOptions = loadingClients || loadingProfessionals || loadingServices;
  const optionsError = clientsError || professionalsError || servicesError;
  const activeProfessionals = professionals.filter(
    (professional) => professional.isActive !== false,
  );
  const activeServices = services.filter((service) => service.isActive !== false);
  const missingData =
    !loadingOptions &&
    !optionsError &&
    (clients.length === 0 || activeProfessionals.length === 0 || activeServices.length === 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Validación justo antes de enviar, usando el tiempo actual.
    if (!clientId || !professionalId || !serviceId) {
      setError('Selecciona un cliente, un profesional y un servicio.');
      return;
    }
    if (!startTime) {
      setError('Debes seleccionar fecha y hora.');
      return;
    }
    const selectedDate = new Date(startTime);
    if (selectedDate <= new Date()) {
      setError('La fecha y hora deben ser posteriores al momento actual.');
      return;
    }

    try {
      await createBooking.mutateAsync({
        clientId,
        professionalId,
        serviceId,
        startTime: selectedDate.toISOString(),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la reserva.');
    }
  }

  return (
    <Modal title="Nueva reserva" tone="light" size="lg" onClose={onClose}>
      {loadingOptions ? (
        <div className="flex flex-col gap-3" aria-label="Cargando datos para la reserva">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-[var(--dash-surface-raised)]"
            />
          ))}
        </div>
      ) : optionsError ? (
        <div className="rounded-xl border border-[var(--dash-danger)]/25 bg-[var(--dash-danger-bg)] p-4">
          <p className="text-sm font-semibold text-[var(--dash-danger)]">
            No pudimos cargar los datos necesarios para reservar.
          </p>
          <p className="mt-1 text-xs text-[var(--dash-text-muted)]">
            Revisa la conexión e intenta nuevamente.
          </p>
          <Button
            tone="light"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              void Promise.all([refetchClients(), refetchProfessionals(), refetchServices()]);
            }}
          >
            Reintentar
          </Button>
        </div>
      ) : missingData ? (
        <div className="rounded-xl border border-dashed border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] p-5 text-center">
          <p className="text-sm font-semibold text-[var(--dash-text)]">
            Faltan datos para crear la reserva
          </p>
          <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
            Necesitas al menos un cliente, un profesional activo y un servicio activo.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <BookingFormSection
            step={1}
            title="Cliente"
            description="Busca y confirma para quién es la cita."
          >
            <ClientAutocomplete
              id="modal-clientId"
              name="clientId"
              clients={clients}
              value={clientId}
              onChange={setClientId}
              required
            />
          </BookingFormSection>

          <BookingFormSection
            step={2}
            title="Profesional y servicio"
            description="Cualquier profesional activo puede realizar cualquier servicio activo."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField
                label="Profesional"
                id="modal-professionalId"
                name="professionalId"
                tone="light"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Selecciona un profesional
                </option>
                {activeProfessionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Servicio"
                id="modal-serviceId"
                name="serviceId"
                tone="light"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Selecciona un servicio
                </option>
                {activeServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {service.duration} min
                  </option>
                ))}
              </SelectField>
            </div>
          </BookingFormSection>

          <BookingFormSection
            step={3}
            title="Fecha y hora"
            description="Elige el horario; los conflictos se validan al reservar."
          >
            <DateTimePicker
              label="Horario de la reserva"
              id="modal-startTime"
              name="startTime"
              value={startTime}
              onChange={setStartTime}
              required
            />
          </BookingFormSection>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-[var(--dash-danger-bg)] px-3 py-2.5 text-sm text-[var(--dash-danger)]"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-[var(--dash-border)] pt-4 sm:flex-row sm:justify-end">
            <Button tone="light" variant="ghost" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              tone="light"
              type="submit"
              className="min-h-11"
              disabled={
                createBooking.isPending || !clientId || !professionalId || !serviceId || !startTime
              }
            >
              {createBooking.isPending ? 'Guardando…' : 'Reservar'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ─── Modal: reprogramar reserva ───────────────────────────────────────────────
function RescheduleBookingModal({
  booking,
  onClose,
  onRescheduled,
}: {
  booking: Booking;
  onClose: () => void;
  onRescheduled: () => void;
}) {
  const {
    data: professionals = [],
    isLoading: loadingProfessionals,
    isError: professionalsError,
    refetch: refetchProfessionals,
  } = useProfessionalsQuery();
  const {
    data: services = [],
    isLoading: loadingServices,
    isError: servicesError,
    refetch: refetchServices,
  } = useServicesQuery();
  const reschedule = useRescheduleBooking();

  const [professionalId, setProfessionalId] = useState(booking.professionalId);
  const [serviceId, setServiceId] = useState(booking.serviceId);
  const [startTime, setStartTime] = useState(booking.startTime);
  const [error, setError] = useState<string | null>(null);

  const loading = loadingProfessionals || loadingServices;
  const optionsError = professionalsError || servicesError;
  const activeProfessionals = professionals.filter(
    (professional) => professional.isActive !== false,
  );
  const activeServices = services.filter((service) => service.isActive !== false);
  const missingOptions = activeProfessionals.length === 0 || activeServices.length === 0;
  const hasChanges =
    professionalId !== booking.professionalId ||
    serviceId !== booking.serviceId ||
    startTime !== booking.startTime;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const body: RescheduleBookingInput = {};
    if (professionalId !== booking.professionalId) body.professionalId = professionalId;
    if (serviceId !== booking.serviceId) body.serviceId = serviceId;

    // Solo enviamos startTime si fue modificado
    if (startTime !== booking.startTime) {
      const selectedDate = new Date(startTime);
      if (selectedDate <= new Date()) {
        setError('La nueva fecha y hora debe ser posterior al momento actual.');
        return;
      }
      body.startTime = selectedDate.toISOString();
    }

    if (Object.keys(body).length === 0) {
      setError('No realizaste ningún cambio.');
      return;
    }

    try {
      await reschedule.mutateAsync({ id: booking.id, ...body });
      onRescheduled();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo reprogramar la reserva.');
    }
  }

  return (
    <Modal title="Reprogramar reserva" tone="light" size="lg" onClose={onClose}>
      {loading ? (
        <div className="flex flex-col gap-3" aria-label="Cargando datos de reprogramación">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-[var(--dash-surface-raised)]"
            />
          ))}
        </div>
      ) : optionsError ? (
        <div className="rounded-xl border border-[var(--dash-danger)]/25 bg-[var(--dash-danger-bg)] p-4">
          <p className="text-sm font-semibold text-[var(--dash-danger)]">
            No pudimos cargar profesionales y servicios.
          </p>
          <Button
            tone="light"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              void Promise.all([refetchProfessionals(), refetchServices()]);
            }}
          >
            Reintentar
          </Button>
        </div>
      ) : missingOptions ? (
        <div className="rounded-xl border border-[var(--dash-accent)]/25 bg-[var(--dash-accent-soft)] p-4">
          <p className="text-sm font-semibold text-[var(--dash-text)]">
            No hay profesionales y servicios activos suficientes para reprogramar.
          </p>
          <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
            Activa al menos un profesional y un servicio antes de cambiar esta reserva.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <section className="overflow-hidden rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                  Reserva actual
                </p>
                <p className="mt-0.5 text-sm font-semibold capitalize text-[var(--dash-text)]">
                  {formatDateTime(booking.startTime)}
                </p>
              </div>
              <Badge status={booking.status} tone="light" />
            </div>
            <dl className="grid grid-cols-1 gap-px bg-[var(--dash-border)] sm:grid-cols-3">
              <div className="min-w-0 bg-[var(--dash-surface)] px-4 py-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                  Cliente
                </dt>
                <dd className="mt-1 truncate text-sm font-medium text-[var(--dash-text)]">
                  {booking.client?.name ?? 'Cliente no disponible'}
                </dd>
              </div>
              <div className="min-w-0 bg-[var(--dash-surface)] px-4 py-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                  Profesional
                </dt>
                <dd className="mt-1 truncate text-sm font-medium text-[var(--dash-text)]">
                  {booking.professional?.name ?? 'Profesional no disponible'}
                </dd>
              </div>
              <div className="min-w-0 bg-[var(--dash-surface)] px-4 py-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--dash-text-muted)]">
                  Servicio
                </dt>
                <dd className="mt-1 truncate text-sm font-medium text-[var(--dash-text)]">
                  {booking.service?.name ?? 'Servicio no disponible'}
                </dd>
                {booking.service?.duration && (
                  <dd className="text-xs text-[var(--dash-text-muted)]">
                    {booking.service.duration} min
                  </dd>
                )}
              </div>
            </dl>
          </section>

          <BookingFormSection
            step={1}
            title="Nueva programación"
            description="Modifica solo los datos que necesites cambiar."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField
                label="Profesional"
                id="reschedule-professionalId"
                name="professionalId"
                tone="light"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                required
              >
                {!activeProfessionals.some(
                  (professional) => professional.id === professionalId,
                ) && (
                  <option value={professionalId} disabled>
                    Profesional actual no disponible
                  </option>
                )}
                {activeProfessionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Servicio"
                id="reschedule-serviceId"
                name="serviceId"
                tone="light"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
              >
                {!activeServices.some((service) => service.id === serviceId) && (
                  <option value={serviceId} disabled>
                    Servicio actual no disponible
                  </option>
                )}
                {activeServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {service.duration} min
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="mt-4 border-t border-[var(--dash-border)] pt-4">
              <DateTimePicker
                label="Nueva fecha y hora"
                id="reschedule-startTime"
                name="startTime"
                value={startTime}
                onChange={setStartTime}
                required
              />
            </div>
          </BookingFormSection>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-[var(--dash-danger-bg)] px-3 py-2.5 text-sm text-[var(--dash-danger)]"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-[var(--dash-border)] pt-4 sm:flex-row sm:justify-end">
            <Button tone="light" variant="ghost" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              tone="light"
              type="submit"
              className="min-h-11"
              disabled={reschedule.isPending || !hasChanges}
            >
              {reschedule.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
