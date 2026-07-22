"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  api,
  ApiError,
  Booking,
  BookingStatus,
  Client,
  Professional,
  Service,
} from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { InputField, SelectField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";

const NEXT_ACTIONS: Partial<Record<BookingStatus, { label: string; to: BookingStatus; variant: "primary" | "danger" }[]>> = {
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

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-DO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingsPage() {
  const [items, setItems] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function load() {
    api
      .get<Booking[]>("/bookings")
      .then((data) =>
        setItems(
          [...data].sort((a, b) => b.startTime.localeCompare(a.startTime)),
        ),
      )
      .catch(() => setError("No pudimos cargar las reservas."));
  }

  useEffect(load, []);

  async function updateStatus(id: string, status: BookingStatus) {
    setUpdatingId(id);
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      load();
    } catch {
      setError("No se pudo actualizar el estado de la reserva.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reservas"
        description="Agenda de citas de tu barbería."
        action={<Button onClick={() => setModalOpen(true)}>+ Nueva reserva</Button>}
      />

      {error && (
        <p className="mb-4 rounded-sm bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {items === null ? (
        <p className="text-sm text-[var(--color-muted)]">Cargando…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Todavía no hay reservas"
          description="Crea la primera cita para un cliente."
          action={<Button onClick={() => setModalOpen(true)}>+ Nueva reserva</Button>}
        />
      ) : (
        <Card>
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((b) => (
              <li key={b.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-[var(--color-paper)]">
                    {b.client?.name ?? "Cliente"} · {b.service?.name ?? "Servicio"}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {formatDateTime(b.startTime)} con {b.professional?.name ?? "profesional"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={b.status} />
                  {(NEXT_ACTIONS[b.status] || []).map((action) => (
                    <Button
                      key={action.to}
                      variant={action.variant}
                      disabled={updatingId === b.id}
                      onClick={() => updateStatus(b.id, action.to)}
                      className="px-2 py-1 text-xs"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {modalOpen && (
        <CreateBookingModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateBookingModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientId, setClientId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Client[]>("/clients"),
      api.get<Professional[]>("/professionals"),
      api.get<Service[]>("/services"),
    ])
      .then(([c, p, s]) => {
        setClients(c);
        setProfessionals(p);
        setServices(s);
      })
      .catch(() => setError("No pudimos cargar clientes/profesionales/servicios."))
      .finally(() => setLoadingOptions(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/bookings", {
        clientId,
        professionalId,
        serviceId,
        startTime: new Date(startTime).toISOString(),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la reserva.");
    } finally {
      setLoading(false);
    }
  }

  const missingData =
    !loadingOptions &&
    (clients.length === 0 || professionals.length === 0 || services.length === 0);

  return (
    <Modal title="Nueva reserva" onClose={onClose}>
      {loadingOptions ? (
        <p className="text-sm text-[var(--color-muted)]">Cargando…</p>
      ) : missingData ? (
        <p className="text-sm text-[var(--color-muted)]">
          Necesitas al menos un cliente, un profesional y un servicio antes de poder crear una reserva.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SelectField
            label="Cliente"
            name="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecciona un cliente
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Profesional"
            name="professionalId"
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecciona un profesional
            </option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Servicio"
            name="serviceId"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecciona un servicio
            </option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration} min)
              </option>
            ))}
          </SelectField>
          <InputField
            label="Fecha y hora"
            name="startTime"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Reservar"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
