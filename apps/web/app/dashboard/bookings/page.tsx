'use client';

import { useEffect, useLayoutEffect, useRef, useState, FormEvent, type ReactNode } from 'react';
import { BusinessTime } from '@/components/ui/BusinessTime';
import { useRouter } from 'next/navigation';
import { canReadBookingEmails, EMAIL_NOTICE_VERSION } from '@/lib/notification-ui';
import { EmailConsent } from '@/components/notifications/EmailConsent';
import {
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
import { BusinessDateTimeField } from '@/components/booking/BusinessDateTimeField';
import { businessDayRange, businessLocalToIso, businessLocalInput } from '@/lib/business-time';
import { scheduleError } from '@/lib/business-schedule';
import { bookingStatusError } from '@/lib/booking-status-error';
import { ErrorText } from '@/components/ui/ErrorText';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonListRows } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth-context';
import { invoiceErrorMessage, invoiceScopeKey } from '@/lib/invoice-ui';
import { useCreateInvoice, useOrganizationTimeZoneQuery } from '@/lib/queries/invoices';
import { ClientAutocomplete } from '@/components/booking/ClientAutocomplete';
import { BookingActions } from '@/components/booking/BookingActions';
import { BookingName } from '@/components/booking/BookingName';
import { isTransientQueryError } from '@/lib/query-recovery';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
type StatusFilter = BookingStatus | 'ALL' | 'TO_ATTEND';
const STATUS_LABELS: Record<StatusFilter, string> = {
  TO_ATTEND: 'Por atender',
  PENDING: 'Pendientes',
  CONFIRMED: 'Confirmadas',
  COMPLETED: 'Completadas',
  CANCELLED: 'Canceladas',
  NO_SHOW: 'No asistió',
  ALL: 'Todas',
};

// ─── Página principal ─────────────────────────────────────────────────────────
export default function BookingsPage() {
  const { user } = useAuth();
  const scope = invoiceScopeKey(user);
  const zone = useOrganizationTimeZoneQuery(scope);
  if (!user || zone.isPending) return <Card tone="light" className="p-5"><p role="status">Cargando la hora del negocio…</p></Card>;
  if (!zone.data || (zone.isError && !isTransientQueryError(zone.error))) return <Card tone="light" className="space-y-3 p-5"><p role="status">{isTransientQueryError(zone.error) ? 'Estamos recuperando la conexión con el negocio…' : 'No pudimos consultar el horario con tu acceso actual.'}</p></Card>;
  return <BookingsWorkspace key={`${scope}:${zone.data}`} timeZone={zone.data} />;
}
function BookingsWorkspace({ timeZone }: { timeZone: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const isBarber = user?.role === 'BARBER';
  const scopeKey = invoiceScopeKey(user);
  const scopeRef = useRef(scopeKey);

  useEffect(() => {
    scopeRef.current = scopeKey;
  }, [scopeKey]);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [visitId] = useState(() => crypto.randomUUID());
  const activeVisit = useRef({ active: false });
  useLayoutEffect(() => {
    const current = { active: true };
    activeVisit.current = current;
    return () => { current.active = false; };
  }, []);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const fromRange = fromDate ? businessDayRange(fromDate, timeZone) : null;
  const toRange = toDate ? businessDayRange(toDate, timeZone) : null;
  const rangeError = Boolean((fromDate && !fromRange) || (toDate && !toRange) || (fromDate && toDate && fromDate > toDate));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TO_ATTEND');

  const filters: BookingFilters = {
    from: fromRange?.start,
    to: toRange?.end,
    status: statusFilter !== 'ALL' && statusFilter !== 'TO_ATTEND' ? statusFilter : undefined,
  };

  // ── Datos ────────────────────────────────────────────────────────────────
  const bookingsQuery = useBookingsQuery(filters, scopeKey ?? undefined, !rangeError, visitId);
  const { data: items, isLoading } = bookingsQuery;
  const isError = bookingsQuery.isError && (!items || !isTransientQueryError(bookingsQuery.error));

  // ── Mutaciones ───────────────────────────────────────────────────────────
  const updateStatus = useUpdateBookingStatus();
  const createInvoice = useCreateInvoice();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const statusErrorRef = useRef<HTMLDivElement>(null);
  const [issuingId, setIssuingId] = useState<string | null>(null);

  useEffect(() => {
    if (statusError) statusErrorRef.current?.focus();
  }, [statusError]);

  async function handleStatusChange(id: string, status: BookingStatus) {
    const currentVisit = activeVisit.current;
    setUpdatingId(id);
    setStatusError(null);
    try {
      await updateStatus.mutateAsync({ id, status });
      if (!currentVisit.active) return;
      toast('Estado de la reserva actualizado.', 'success');
    } catch (error) {
      if (!currentVisit.active) return;
      setStatusError(bookingStatusError(error, items?.find((booking) => booking.id === id)?.status, status));
    } finally {
      if (currentVisit.active) setUpdatingId(null);
    }
  }

  async function handleIssueInvoice(bookingId: string) {
    if (!scopeKey) return;
    const operationScope = scopeKey;
    const currentVisit = activeVisit.current;
    setIssuingId(bookingId);
    try {
      await createInvoice.mutateAsync({ bookingId, scopeKey: operationScope });
      if (!currentVisit.active || scopeRef.current !== operationScope) return;
      toast('Factura disponible.', 'success');
      router.push('/dashboard/invoices');
    } catch (error) {
      if (currentVisit.active && scopeRef.current === operationScope) {
        toast(invoiceErrorMessage(error, 'issue'), 'error');
      }
    } finally {
      if (currentVisit.active && scopeRef.current === operationScope) setIssuingId(null);
    }
  }

  // ── Modales ──────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);

  // ── Agenda ordenada cronológicamente dentro del rango ────────────────────
  // Proyección local del contrato vigente; las alternativas de consulta D siguen pendientes.
  const sorted = items ? items.filter(item => statusFilter !== 'TO_ATTEND' || item.status === 'PENDING' || item.status === 'CONFIRMED')
    .sort((a, b) => a.startTime.localeCompare(b.startTime)) : [];

  // ── ¿Hay filtros activos distintos a los por defecto? ────────────────────
  const hasActiveFilters =
    statusFilter !== 'TO_ATTEND' || Boolean(fromDate || toDate);

  function clearFilters() {
    setFromDate('');
    setToDate('');
    setStatusFilter('TO_ATTEND');
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
            disabled={rangeError}
            onClick={() => setCreateOpen(true)}
          >
            + Nueva reserva
          </Button>
        }
      />

      <p className="mb-3 text-sm text-[var(--dash-text-muted)]">Fechas y horarios en hora del negocio.</p>
      {statusError && <div ref={statusErrorRef} tabIndex={-1} role="alert" className="mb-3 rounded-lg border border-[var(--dash-danger)]/30 bg-[var(--dash-danger-bg)] p-4 text-sm text-[var(--dash-danger)]"><ErrorText message={statusError} /></div>}
      {rangeError && <p role="alert" className="mb-3">Revisa el rango de fechas; esa fecha no está disponible en el negocio.</p>}
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
              className="dashboard-date-filter h-11 w-full min-w-0 max-w-full rounded-lg border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] px-3 py-2 text-base sm:text-sm text-[var(--dash-text)] outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--dash-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent-soft)]"
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
              className="dashboard-date-filter h-11 w-full min-w-0 max-w-full rounded-lg border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] px-3 py-2 text-base sm:text-sm text-[var(--dash-text)] outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--dash-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent-soft)]"
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
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="min-h-10 w-full rounded-lg border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] px-3 py-2 text-sm text-[var(--dash-text)] outline-none transition-[border-color,box-shadow] focus-visible:border-[var(--dash-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent-soft)]"
            >
              {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
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
              className="min-h-10 w-full self-end border border-[var(--dash-border)] bg-[var(--dash-surface)] px-3 text-xs text-[var(--dash-text-muted)] shadow-sm outline-none hover:border-[var(--dash-border-strong)] hover:bg-[var(--dash-surface-raised)] hover:text-[var(--dash-text)] focus-visible:ring-2 focus-visible:ring-[var(--dash-accent-soft)] sm:w-auto"
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
          <p role="status" className="text-sm text-[var(--dash-danger)]">{isTransientQueryError(bookingsQuery.error) ? 'No pudimos cargar las reservas. La consulta se actualizará automáticamente.' : 'No pudimos consultar estas reservas con tu acceso actual.'}</p>
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
          title={hasActiveFilters ? 'Sin reservas con estos filtros' : 'No hay reservas por atender'}
          description={
            hasActiveFilters
              ? 'Limpia los filtros para ver las reservas por atender.'
              : 'Aquí verás las reservas pendientes y confirmadas.'
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
                    <p className="font-semibold text-[var(--dash-text)]">
                      <BusinessTime value={b.startTime} zone={timeZone} />
                    </p>
                    <p className="text-xs text-[var(--dash-text-muted)]">
                      hasta <BusinessTime value={b.endTime} zone={timeZone} />
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
                  isIssuing={issuingId === b.id}
                  layout="mobile"
                  onStatusChange={(status) => handleStatusChange(b.id, status)}
                  onReschedule={() => setRescheduleTarget(b)}
                  onIssueInvoice={() => handleIssueInvoice(b.id)}
                  onViewInvoices={() => router.push('/dashboard/invoices')}
                  onNotifications={canReadBookingEmails(user?.role) ? () => router.push(`/dashboard/bookings/${b.id}/notifications`) : undefined}
                />
              </article>
            ))}
          </div>

          {/* Vista desktop (Tabla) */}
          <div className="hidden lg:block">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[14%]" />
                <col className="w-[13%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[25%]" />
              </colgroup>
              <thead className="border-b border-[var(--dash-border)] bg-[var(--dash-surface-raised)]">
                <tr>
                  {['Fecha / hora', 'Cliente', 'Profesional', 'Servicio', 'Estado', 'Acciones'].map(
                    (h) => (
                      <th
                        scope="col"
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
                        className="font-medium text-[var(--dash-text)]"
                      >
                        <BusinessTime value={b.startTime} zone={timeZone} />
                      </p>
                      <p className="text-xs text-[var(--dash-text-muted)]">
                        hasta <BusinessTime value={b.endTime} zone={timeZone} />
                      </p>
                    </td>
                    <td className="overflow-hidden px-3 py-3 xl:px-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="min-w-0 w-full font-medium">
                          <BookingName name={b.client?.name} />
                          {b.client?.phone && (
                            <p className="truncate text-xs text-[var(--dash-text-muted)]">
                              {b.client.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="overflow-hidden px-3 py-3 xl:px-4">
                      <BookingName name={b.professional?.name} />
                    </td>
                    <td className="overflow-hidden px-3 py-3 xl:px-4">
                      <BookingName name={b.service?.name} />
                      {b.service?.duration && (
                        <p className="text-xs text-[var(--dash-text-muted)]">
                          {b.service.duration} min
                        </p>
                      )}
                    </td>
                    <td className="overflow-hidden px-2 py-3 xl:px-4">
                      <Badge status={b.status} tone="light" />
                      {b.invoice && <p className="mt-1 text-xs text-[var(--dash-text-muted)]">
                        {b.invoice.state === 'PAID' ? 'Factura pagada' : 'Pendiente de cobro'}
                      </p>}
                    </td>
                    <td className="px-2 py-3 xl:px-4">
                      <BookingActions
                        booking={b}
                        isBarber={isBarber}
                        isUpdating={updatingId === b.id}
                        isIssuing={issuingId === b.id}
                        layout="table"
                        onStatusChange={(status) => handleStatusChange(b.id, status)}
                        onReschedule={() => setRescheduleTarget(b)}
                        onIssueInvoice={() => handleIssueInvoice(b.id)}
                        onViewInvoices={() => router.push('/dashboard/invoices')}
                        onNotifications={canReadBookingEmails(user?.role) ? () => router.push(`/dashboard/bookings/${b.id}/notifications`) : undefined}
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
              {sorted.length} reserva{sorted.length !== 1 ? 's' : ''}{fromDate || toDate ? ' en el rango seleccionado' : ''}
            </p>
          </div>
        </div>
      )}

      {/* ── Modal: crear reserva ─────────────────────────────────────────── */}
      {createOpen && (
        <CreateBookingModal
          timeZone={timeZone}
          key={scopeKey}
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
          timeZone={timeZone}
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
  timeZone,
  onClose,
  onCreated,
}: {
  timeZone: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const mayRecordEmail = canReadBookingEmails(user?.role);
  const [emailOptedIn, setEmailOptedIn] = useState(false);
  const [reviewedEmail, setReviewedEmail] = useState('');
  const [emailReviewed, setEmailReviewed] = useState(false);
  const visit = useRef({ active: true });
  useLayoutEffect(() => {
    const current = { active: true };
    visit.current = current;
    return () => { current.active = false; };
  }, []);
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
    const currentVisit = visit.current;
    if (createBooking.isPending) return;
    setError(null);
    if (mayRecordEmail && emailOptedIn && (!emailReviewed || !reviewedEmail.trim())) {
      setError('Revisa el correo con el cliente y confirma su elección antes de reservar.');
      return;
    }

    // Validación justo antes de enviar, usando el tiempo actual.
    if (!clientId || !professionalId || !serviceId) {
      setError('Selecciona un cliente, un profesional y un servicio.');
      return;
    }
    if (!startTime) {
      setError('Debes seleccionar fecha y hora.');
      return;
    }
    const instant = businessLocalToIso(startTime, timeZone);
    if (!instant) { setError('Esa hora no existe o se repite en el negocio. Elige otra fecha u hora.'); return; }
    const selectedDate = new Date(instant);
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
        ...(mayRecordEmail ? { emailNotifications: {
          optedIn: emailOptedIn, noticeVersion: EMAIL_NOTICE_VERSION,
          ...(emailOptedIn ? { reviewedEmail: reviewedEmail.trim() } : {}),
        } } : {}),
      });
      if (!currentVisit.active) return;
      onCreated();
    } catch (err) {
      if (!currentVisit.active) return;
      setError(scheduleError(err));
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
              onChange={(id) => { setClientId(id); setEmailOptedIn(false); setEmailReviewed(false); setReviewedEmail(''); }}
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
            <BusinessDateTimeField
              label="Horario de la reserva"
              id="modal-startTime"
              name="startTime"
              value={startTime}
              onChange={setStartTime}
              required
            />
          </BookingFormSection>

          {mayRecordEmail && <section className="space-y-3" aria-label="Avisos por correo de la reserva">
            <h3 className="text-sm font-semibold">Avisos por correo (opcional)</h3>
            <p className="text-sm text-[var(--dash-text-muted)]">Lee este aviso al cliente y registra únicamente su elección.</p>
            <EmailConsent checked={emailOptedIn} disabled={createBooking.isPending}
              onChange={(checked) => { setEmailOptedIn(checked); setEmailReviewed(false); setReviewedEmail(''); }} />
            {emailOptedIn && <>
              <label className="block text-sm">Correo revisado con el cliente
                <input type="email" required maxLength={254} autoComplete="off" value={reviewedEmail}
                  disabled={createBooking.isPending} className="mt-2 w-full rounded-md border border-[var(--dash-border)] p-2 focus-visible:outline-2"
                  onChange={(event) => { setReviewedEmail(event.target.value); setEmailReviewed(false); }} />
              </label>
              <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0"
                checked={emailReviewed} disabled={createBooking.isPending} onChange={(event) => setEmailReviewed(event.target.checked)} />
                <span>El cliente eligió recibir estos avisos y revisé con él su correo registrado.</span></label>
              <p className="text-xs text-[var(--dash-text-muted)]">Debe coincidir con el correo de su ficha. No cambia el contacto ni verifica la propiedad del buzón.</p>
            </>}
          </section>}

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
  timeZone,
  booking,
  onClose,
  onRescheduled,
}: {
  timeZone: string;
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
  const originalLocal = businessLocalInput(booking.startTime, timeZone);
  const [startTime, setStartTime] = useState(originalLocal);
  const rescheduleVisit = useRef({ active: false });
  useLayoutEffect(() => {
    const current = { active: true };
    rescheduleVisit.current = current;
    return () => { current.active = false; };
  }, []);
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
    startTime !== originalLocal;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const currentVisit = rescheduleVisit.current;
    if (reschedule.isPending) return;
    const body: RescheduleBookingInput = {};
    if (professionalId !== booking.professionalId) body.professionalId = professionalId;
    if (serviceId !== booking.serviceId) body.serviceId = serviceId;

    // Solo enviamos startTime si fue modificado
    if (startTime !== originalLocal) {
      const instant = businessLocalToIso(startTime, timeZone);
      if (!instant) { setError('Esa hora no existe o se repite en el negocio. Elige otra fecha u hora.'); return; }
      const selectedDate = new Date(instant);
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
      if (currentVisit.active) onRescheduled();
    } catch (err) {
      if (currentVisit.active) setError(scheduleError(err));
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
                <p className="mt-0.5 text-sm font-semibold text-[var(--dash-text)]">
                  <BusinessTime value={booking.startTime} zone={timeZone} />
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
              <BusinessDateTimeField
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
