"use client";

import { useState, FormEvent } from "react";
import {
  ApiError,
  Booking,
  BookingFilters,
  BookingStatus,
  RescheduleBookingInput,
} from "@/lib/api";
import {
  useBookingsQuery,
  useCreateBooking,
  useUpdateBookingStatus,
  useRescheduleBooking,
} from "@/lib/queries/bookings";
import { useProfessionalsQuery } from "@/lib/queries/professionals";
import { useServicesQuery } from "@/lib/queries/services";
import { useClientsQuery } from "@/lib/queries/clients";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/Field";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";

// ─── Acciones de cambio de estado según estado actual ───────────────────────
const NEXT_ACTIONS: Partial<
  Record<BookingStatus, { label: string; to: BookingStatus; variant: "primary" | "danger" }[]>
> = {
  PENDING: [
    { label: "Confirmar", to: "CONFIRMED", variant: "primary" },
    { label: "Cancelar", to: "CANCELLED", variant: "danger" },
  ],
  CONFIRMED: [
    { label: "Completar", to: "COMPLETED", variant: "primary" },
    { label: "No asistió", to: "NO_SHOW", variant: "danger" },
    { label: "Cancelar", to: "CANCELLED", variant: "danger" },
  ],
};

// Para BARBER: solo confirmar y completar (sin cancelar)
const BARBER_NEXT_ACTIONS: Partial<
  Record<BookingStatus, { label: string; to: BookingStatus; variant: "primary" | "danger" }[]>
> = {
  PENDING: [{ label: "Confirmar", to: "CONFIRMED", variant: "primary" }],
  CONFIRMED: [
    { label: "Completar", to: "COMPLETED", variant: "primary" },
    { label: "No asistió", to: "NO_SHOW", variant: "danger" },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-DO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString("es-DO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Devuelve un string "YYYY-MM-DD" en hora local (no UTC) para inputs type=date */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Etiquetas de filtro de estado ───────────────────────────────────────────
const STATUS_LABELS: Record<BookingStatus | "ALL", string> = {
  ALL: "Todos",
  PENDING: "Pendientes",
  CONFIRMED: "Confirmadas",
  COMPLETED: "Completadas",
  CANCELLED: "Canceladas",
  NO_SHOW: "No asistió",
};

// ─── Página principal ─────────────────────────────────────────────────────────
export default function BookingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isBarber = user?.role === "BARBER";

  // ── Filtros ──────────────────────────────────────────────────────────────
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const [fromDate, setFromDate] = useState(toLocalDateString(monday));
  const [toDate, setToDate] = useState(toLocalDateString(sunday));
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");

  const filters: BookingFilters = {
    from: fromDate || undefined,
    to: toDate || undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
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
      toast("Estado de la reserva actualizado.", "success");
    } catch {
      toast("No se pudo actualizar el estado.", "error");
    } finally {
      setUpdatingId(null);
    }
  }

  // ── Modales ──────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);

  // ── Tabla ordenada (más reciente primero dentro del rango) ────────────────
  const sorted = items
    ? [...items].sort((a, b) => b.startTime.localeCompare(a.startTime))
    : [];

  // ── Acciones disponibles según rol ───────────────────────────────────────
  const nextActions = isBarber ? BARBER_NEXT_ACTIONS : NEXT_ACTIONS;

  // ── ¿Hay filtros activos distintos a los por defecto? ────────────────────
  const hasActiveFilters =
    statusFilter !== "ALL" ||
    fromDate !== toLocalDateString(monday) ||
    toDate !== toLocalDateString(sunday);

  function clearFilters() {
    setFromDate(toLocalDateString(monday));
    setToDate(toLocalDateString(sunday));
    setStatusFilter("ALL");
  }

  return (
    <div>
      <PageHeader
        tone="light"
        title={isBarber ? "Mi agenda" : "Reservas"}
        description={
          isBarber
            ? "Tus citas, no las de todo el equipo."
            : "Agenda de citas de tu barbería."
        }
        action={
          <Button tone="light" onClick={() => setCreateOpen(true)}>
            + Nueva reserva
          </Button>
        }
      />

      {/* ── Barra de filtros ─────────────────────────────────────────────── */}
      <Card tone="light" className="mb-5 px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-from"
              className="text-[10px] font-medium uppercase tracking-wider text-[var(--dash-text-muted)]"
            >
              Desde
            </label>
            <input
              id="filter-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] px-3 py-1.5 text-sm text-[var(--dash-text)] outline-none focus:border-[var(--dash-accent)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-to"
              className="text-[10px] font-medium uppercase tracking-wider text-[var(--dash-text-muted)]"
            >
              Hasta
            </label>
            <input
              id="filter-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] px-3 py-1.5 text-sm text-[var(--dash-text)] outline-none focus:border-[var(--dash-accent)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="filter-status"
              className="text-[10px] font-medium uppercase tracking-wider text-[var(--dash-text-muted)]"
            >
              Estado
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "ALL")}
              className="rounded-sm border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] px-3 py-1.5 text-sm text-[var(--dash-text)] outline-none focus:border-[var(--dash-accent)] transition-colors"
            >
              {(Object.keys(STATUS_LABELS) as (BookingStatus | "ALL")[]).map((s) => (
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
              className="self-end text-xs"
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
          <p className="text-sm text-[var(--dash-danger)]">
            No pudimos cargar las reservas.
          </p>
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

      {/* ── Sin datos en absoluto ────────────────────────────────────────── */}
      {!isLoading && !isError && sorted.length === 0 && !hasActiveFilters && (
        <EmptyState
          tone="light"
          title="Todavía no hay reservas"
          description="Crea la primera cita para un cliente."
          action={
            <Button tone="light" onClick={() => setCreateOpen(true)}>
              + Nueva reserva
            </Button>
          }
        />
      )}

      {/* ── Sin resultados para los filtros activos ──────────────────────── */}
      {!isLoading && !isError && sorted.length === 0 && hasActiveFilters && (
        <EmptyState
          tone="light"
          title="Sin reservas en este rango"
          description="Prueba cambiando las fechas o el estado del filtro."
          action={
            <Button tone="light" variant="secondary" onClick={clearFilters}>
              Ver todas las reservas
            </Button>
          }
        />
      )}

      {/* ── Listado de reservas ────────────────────────────────────────────── */}
      {!isLoading && !isError && sorted.length > 0 && (
        <div className="rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface)] shadow-[var(--dash-shadow-card)]">
          
          {/* Vista móvil (Cards) */}
          <div className="grid grid-cols-1 divide-y divide-[var(--dash-border)] md:hidden">
            {sorted.map((b) => {
              const actions = nextActions[b.status] ?? [];
              const canReschedule = (b.status === "PENDING" || b.status === "CONFIRMED") && !isBarber;

              return (
                <div key={b.id} className="flex flex-col gap-3 p-4">
                  {/* Header de la card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--dash-text)]">
                        {formatDateTime(b.startTime)}
                      </p>
                      <p className="text-xs text-[var(--dash-text-muted)]">
                        hasta {formatTimeOnly(b.endTime)}
                      </p>
                    </div>
                    <Badge status={b.status} tone="light" />
                  </div>

                  {/* Body de la card */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] font-medium uppercase text-[var(--dash-text-muted)]">Cliente</p>
                      <p className="text-[var(--dash-text)]">{b.client?.name ?? "—"}</p>
                      {b.client?.phone && <p className="text-xs text-[var(--dash-text-muted)]">{b.client.phone}</p>}
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-[var(--dash-text-muted)]">Servicio</p>
                      <p className="text-[var(--dash-text)]">{b.service?.name ?? "—"}</p>
                      {b.service?.duration && <p className="text-xs text-[var(--dash-text-muted)]">{b.service.duration} min</p>}
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-medium uppercase text-[var(--dash-text-muted)]">Profesional</p>
                      <p className="text-[var(--dash-text)]">{b.professional?.name ?? "—"}</p>
                    </div>
                  </div>

                  {/* Acciones de la card */}
                  <div className="mt-1 flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <Button
                        key={action.to}
                        tone="light"
                        variant={action.variant}
                        disabled={updatingId === b.id}
                        onClick={() => handleStatusChange(b.id, action.to)}
                        className="px-3 py-1.5 text-xs flex-1"
                      >
                        {action.label}
                      </Button>
                    ))}
                    {canReschedule && (
                      <Button
                        tone="light"
                        variant="secondary"
                        className="px-3 py-1.5 text-xs flex-1"
                        onClick={() => setRescheduleTarget(b)}
                      >
                        Reprogramar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vista desktop (Tabla) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="border-b border-[var(--dash-border)] bg-[var(--dash-surface-raised)]">
                <tr>
                  {["Fecha / hora", "Cliente", "Profesional", "Servicio", "Estado", "Acciones"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-[var(--dash-text-muted)]"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--dash-border)]">
                {sorted.map((b) => {
                  const actions = nextActions[b.status] ?? [];
                  const canReschedule =
                    (b.status === "PENDING" || b.status === "CONFIRMED") && !isBarber;

                  return (
                    <tr
                      key={b.id}
                      className="transition-colors duration-150 hover:bg-[var(--dash-surface-raised)]"
                    >
                      <td className="min-w-0 px-4 py-3">
                        <p className="whitespace-nowrap font-medium text-[var(--dash-text)]">
                          {formatDateTime(b.startTime)}
                        </p>
                        <p className="text-xs text-[var(--dash-text-muted)]">
                          hasta {formatTimeOnly(b.endTime)}
                        </p>
                      </td>
                      <td className="min-w-0 px-4 py-3">
                        <p className="truncate text-[var(--dash-text)]">
                          {b.client?.name ?? "—"}
                        </p>
                        {b.client?.phone && (
                          <p className="truncate text-xs text-[var(--dash-text-muted)]">
                            {b.client.phone}
                          </p>
                        )}
                      </td>
                      <td className="min-w-0 px-4 py-3">
                        <p className="truncate text-[var(--dash-text)]">
                          {b.professional?.name ?? "—"}
                        </p>
                      </td>
                      <td className="min-w-0 px-4 py-3">
                        <p className="truncate text-[var(--dash-text)]">
                          {b.service?.name ?? "—"}
                        </p>
                        {b.service?.duration && (
                          <p className="text-xs text-[var(--dash-text-muted)]">
                            {b.service.duration} min
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={b.status} tone="light" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {actions.map((action) => (
                            <Button
                              key={action.to}
                              tone="light"
                              variant={action.variant}
                              disabled={updatingId === b.id}
                              onClick={() => handleStatusChange(b.id, action.to)}
                              className="px-2.5 py-1 text-xs"
                            >
                              {action.label}
                            </Button>
                          ))}
                          {canReschedule && (
                            <Button
                              tone="light"
                              variant="secondary"
                              className="px-2.5 py-1 text-xs"
                              onClick={() => setRescheduleTarget(b)}
                            >
                              Reprogramar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Contador de resultados */}
          <div className="border-t border-[var(--dash-border)] px-4 py-2.5">
            <p className="text-xs text-[var(--dash-text-muted)]">
              {sorted.length} reserva{sorted.length !== 1 ? "s" : ""}
              {hasActiveFilters ? " en este rango" : " en total"}
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
            toast("Reserva creada.", "success");
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
            toast("Reserva reprogramada.", "success");
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
  const { data: clients = [], isLoading: loadingClients } = useClientsQuery();
  const { data: professionals = [], isLoading: loadingProfessionals } = useProfessionalsQuery();
  const { data: services = [], isLoading: loadingServices } = useServicesQuery();
  const createBooking = useCreateBooking();

  const [clientId, setClientId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadingOptions = loadingClients || loadingProfessionals || loadingServices;
  const missingData =
    !loadingOptions &&
    (clients.length === 0 || professionals.length === 0 || services.length === 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Validación justo antes de enviar, usando el tiempo actual.
    if (!startTime) {
      setError("Debes seleccionar fecha y hora.");
      return;
    }
    const selectedDate = new Date(startTime);
    if (selectedDate <= new Date()) {
      setError("La fecha y hora deben ser posteriores al momento actual.");
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
      setError(err instanceof ApiError ? err.message : "No se pudo crear la reserva.");
    }
  }

  return (
    <Modal title="Nueva reserva" tone="light" onClose={onClose}>
      {loadingOptions ? (
        <div className="flex flex-col gap-3 py-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-sm bg-[var(--dash-surface-raised)]" />
          ))}
        </div>
      ) : missingData ? (
        <p className="text-sm text-[var(--dash-text-muted)]">
          Necesitas al menos un cliente, un profesional activo y un servicio antes de poder
          crear una reserva.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SelectField
            label="Cliente"
            id="modal-clientId"
            name="clientId"
            tone="light"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="" disabled>Selecciona un cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectField>

          <SelectField
            label="Profesional"
            id="modal-professionalId"
            name="professionalId"
            tone="light"
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            required
          >
            <option value="" disabled>Selecciona un profesional</option>
            {professionals
              .filter((p) => p.isActive !== false)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
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
            <option value="" disabled>Selecciona un servicio</option>
            {services
              .filter((s) => s.isActive !== false)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration} min
                </option>
              ))}
          </SelectField>

          <DateTimePicker
            label="Fecha y hora"
            id="modal-startTime"
            name="startTime"
            value={startTime}
            onChange={setStartTime}
            required
          />

          {error && <p className="text-sm text-[var(--dash-danger)]">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button tone="light" variant="ghost" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button tone="light" type="submit" disabled={createBooking.isPending || !startTime}>
              {createBooking.isPending ? "Guardando…" : "Reservar"}
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
  const { data: professionals = [], isLoading: loadingProfessionals } = useProfessionalsQuery();
  const { data: services = [], isLoading: loadingServices } = useServicesQuery();
  const reschedule = useRescheduleBooking();

  const [professionalId, setProfessionalId] = useState(booking.professionalId);
  const [serviceId, setServiceId] = useState(booking.serviceId);
  const [startTime, setStartTime] = useState(booking.startTime);
  const [error, setError] = useState<string | null>(null);

  const loading = loadingProfessionals || loadingServices;

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
        setError("La nueva fecha y hora debe ser posterior al momento actual.");
        return;
      }
      body.startTime = selectedDate.toISOString();
    }

    if (Object.keys(body).length === 0) {
      setError("No realizaste ningún cambio.");
      return;
    }

    try {
      await reschedule.mutateAsync({ id: booking.id, ...body });
      onRescheduled();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo reprogramar la reserva.");
    }
  }

  return (
    <Modal title="Reprogramar reserva" tone="light" onClose={onClose}>
      {loading ? (
        <div className="flex flex-col gap-3 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-sm bg-[var(--dash-surface-raised)]" />
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="rounded-sm bg-[var(--dash-surface-raised)] px-3 py-2.5">
            <p className="text-xs text-[var(--dash-text-muted)]">
              Cliente:{" "}
              <span className="font-medium text-[var(--dash-text)]">
                {booking.client?.name ?? booking.clientId}
              </span>
            </p>
          </div>

          <SelectField
            label="Profesional"
            id="reschedule-professionalId"
            name="professionalId"
            tone="light"
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            required
          >
            {professionals
              .filter((p) => p.isActive !== false)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
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
            {services
              .filter((s) => s.isActive !== false)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration} min
                </option>
              ))}
          </SelectField>

          <DateTimePicker
            label="Nueva fecha y hora"
            id="reschedule-startTime"
            name="startTime"
            value={startTime}
            onChange={setStartTime}
            required
          />

          {error && <p className="text-sm text-[var(--dash-danger)]">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button tone="light" variant="ghost" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button tone="light" type="submit" disabled={reschedule.isPending}>
              {reschedule.isPending ? "Guardando…" : "Reprogramar"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
