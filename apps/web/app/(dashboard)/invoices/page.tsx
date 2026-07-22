"use client";

import { useEffect, useState, FormEvent } from "react";
import { api, ApiError, Booking, Invoice } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { InputField, SelectField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";

function formatMoney(value: string | number) {
  return `RD$${Number(value).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;
}

export default function InvoicesPage() {
  const [items, setItems] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  function load() {
    api
      .get<Invoice[]>("/invoices")
      .then(setItems)
      .catch(() => setError("No pudimos cargar las facturas."));
  }

  useEffect(load, []);

  async function markAsPaid(id: string) {
    setPayingId(id);
    try {
      await api.patch(`/invoices/${id}/pay`);
      load();
    } catch {
      setError("No se pudo marcar la factura como pagada.");
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Facturación"
        description="Facturas generadas a partir de citas completadas."
        action={<Button onClick={() => setModalOpen(true)}>+ Nueva factura</Button>}
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
          title="Todavía no hay facturas"
          description="Genera una factura a partir de una cita completada."
          action={<Button onClick={() => setModalOpen(true)}>+ Nueva factura</Button>}
        />
      ) : (
        <Card>
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm text-[var(--color-paper)]">
                    {inv.booking?.client?.name ?? "Cliente"} ·{" "}
                    {inv.booking?.service?.name ?? "Servicio"}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {inv.booking?.startTime &&
                      new Date(inv.booking.startTime).toLocaleDateString("es-DO")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-brass)]">
                    {formatMoney(inv.amount)}
                  </p>
                  <Badge status={inv.status} />
                  {inv.status === "UNPAID" && (
                    <Button
                      disabled={payingId === inv.id}
                      onClick={() => markAsPaid(inv.id)}
                      className="px-2 py-1 text-xs"
                    >
                      {payingId === inv.id ? "…" : "Marcar pagada"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {modalOpen && (
        <CreateInvoiceModal
          existingInvoices={items || []}
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

function CreateInvoiceModal({
  existingInvoices,
  onClose,
  onCreated,
}: {
  existingInvoices: Invoice[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingId, setBookingId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    api
      .get<Booking[]>("/bookings")
      .then(setBookings)
      .catch(() => setError("No pudimos cargar las reservas."))
      .finally(() => setLoadingOptions(false));
  }, []);

  const invoicedBookingIds = new Set(existingInvoices.map((i) => i.bookingId));
  const invoiceableBookings = bookings.filter(
    (b) => b.status === "COMPLETED" && !invoicedBookingIds.has(b.id),
  );

  function handleBookingSelect(id: string) {
    setBookingId(id);
    const booking = bookings.find((b) => b.id === id);
    if (booking?.service?.price) {
      setAmount(String(booking.service.price));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/invoices", { bookingId, amount: Number(amount) });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la factura.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Nueva factura" onClose={onClose}>
      {loadingOptions ? (
        <p className="text-sm text-[var(--color-muted)]">Cargando…</p>
      ) : invoiceableBookings.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          No hay citas completadas pendientes de facturar. Marca una reserva como
          &ldquo;Completada&rdquo; en Reservas primero.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SelectField
            label="Cita completada"
            name="bookingId"
            value={bookingId}
            onChange={(e) => handleBookingSelect(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecciona una cita
            </option>
            {invoiceableBookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.client?.name} · {b.service?.name} ·{" "}
                {new Date(b.startTime).toLocaleDateString("es-DO")}
              </option>
            ))}
          </SelectField>
          <InputField
            label="Monto (RD$)"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Generar factura"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
