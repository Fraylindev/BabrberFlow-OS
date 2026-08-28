"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser, Invoice, InvoiceState, PaymentMethod } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  formatBusinessDateTime,
  formatDopAmount,
  invoiceErrorMessage,
  invoiceScopeKey,
  isCurrentInvoiceScope,
  PAYMENT_METHOD_LABELS,
} from "@/lib/invoice-ui";
import {
  useInvoicesQuery,
  useOrganizationTimeZoneQuery,
  useRecordInvoicePayment,
} from "@/lib/queries/invoices";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SelectField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

const PAGE_SIZE = 20;
type StateFilter = "ALL" | InvoiceState;

const FILTERS: Array<{ value: StateFilter; label: string }> = [
  { value: "ALL", label: "Todas" },
  { value: "ISSUED", label: "Pendientes de cobro" },
  { value: "PAID", label: "Cobradas" },
];

export default function InvoicesPage() {
  const { user } = useAuth();
  const scopeKey = invoiceScopeKey(user);

  return <ScopedInvoicesPage key={scopeKey ?? "disabled"} user={user} scopeKey={scopeKey} />;
}

function ScopedInvoicesPage({
  user,
  scopeKey,
}: {
  user: AuthUser | null;
  scopeKey: string | null;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const scopeRef = useRef(scopeKey);
  const [stateFilter, setStateFilter] = useState<StateFilter>("ALL");
  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");

  useEffect(() => {
    scopeRef.current = scopeKey;
    return () => {
      scopeRef.current = null;
    };
  }, [scopeKey]);

  const filters = {
    page,
    limit: PAGE_SIZE,
    ...(stateFilter === "ALL" ? {} : { state: stateFilter }),
  };
  const invoicesQuery = useInvoicesQuery(scopeKey, filters);
  const timeZoneQuery = useOrganizationTimeZoneQuery(scopeKey);
  const paymentMutation = useRecordInvoicePayment();
  const isBarber = user?.role === "BARBER";
  const isLoading = invoicesQuery.isPending || timeZoneQuery.isPending;
  const hasError = invoicesQuery.isError || timeZoneQuery.isError;
  const items = invoicesQuery.data?.items ?? [];
  const pagination = invoicesQuery.data?.pagination;

  function changeFilter(next: StateFilter) {
    setStateFilter(next);
    setPage(1);
  }

  function openPayment(invoice: Invoice) {
    setPaymentMethod("CASH");
    paymentMutation.reset();
    setSelectedInvoice(invoice);
  }

  async function recordPayment() {
    if (!selectedInvoice || !scopeKey) return;
    const operationScope = scopeKey;
    try {
      await paymentMutation.mutateAsync({
        invoiceId: selectedInvoice.id,
        method: paymentMethod,
        scopeKey: operationScope,
      });
      if (!isCurrentInvoiceScope(scopeRef.current, operationScope)) return;
      setSelectedInvoice(null);
      toast("Cobro registrado.", "success");
    } catch {
      // El mensaje contextual se muestra dentro del diálogo.
    }
  }

  function retry() {
    void invoicesQuery.refetch();
    void timeZoneQuery.refetch();
  }

  const title = isBarber ? "Facturación de mis servicios" : "Facturación";
  const description = isBarber
    ? "Consulta y registra los cobros de las reservas que atendiste."
    : "Emite facturas internas desde Reservas y registra sus cobros completos.";

  return (
    <div>
      <PageHeader
        tone="light"
        title={title}
        description={description}
        action={
          <Button tone="light" onClick={() => router.push("/dashboard/bookings")}>
            Ir a reservas
          </Button>
        }
      />

      <div
        className="mb-5 flex flex-wrap gap-2"
        role="group"
        aria-label="Filtrar facturas por estado"
      >
        {FILTERS.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            tone="light"
            variant={stateFilter === filter.value ? "primary" : "secondary"}
            aria-pressed={stateFilter === filter.value}
            onClick={() => changeFilter(filter.value)}
            className="min-h-10"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {hasError ? (
        <Card tone="light" className="p-6 text-center">
          <p role="alert" className="text-sm font-medium text-[var(--dash-danger)]">
            {invoiceErrorMessage(invoicesQuery.error, "list")}
          </p>
          <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
            Revisa tu conexión e inténtalo de nuevo.
          </p>
          <Button tone="light" variant="secondary" className="mt-4" onClick={retry}>
            Reintentar
          </Button>
        </Card>
      ) : isLoading ? (
        <Card tone="light" aria-label="Cargando facturación">
          <SkeletonListRows />
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          tone="light"
          title={stateFilter === "ALL" ? "Todavía no hay facturas" : "No hay facturas con este estado"}
          description={
            stateFilter === "ALL"
              ? "Ve a Reservas y emite la factura desde una cita completada."
              : "Prueba otro filtro o consulta tus reservas completadas."
          }
          action={
            <Button tone="light" onClick={() => router.push("/dashboard/bookings")}>
              Ir a reservas
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                timeZone={timeZoneQuery.data!}
                isBarber={isBarber}
                onPayment={() => openPayment(invoice)}
              />
            ))}
          </div>

          <Card tone="light" className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[var(--dash-surface-raised)] text-xs uppercase tracking-wider text-[var(--dash-text-muted)]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Reserva</th>
                    <th scope="col" className="px-4 py-3 font-medium">Servicio</th>
                    {!isBarber && <th scope="col" className="px-4 py-3 font-medium">Profesional</th>}
                    <th scope="col" className="px-4 py-3 text-right font-medium">Importe</th>
                    <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                    <th scope="col" className="px-4 py-3 font-medium">Cobro</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--dash-border)] text-[var(--dash-text)]">
                  {items.map((invoice) => (
                    <InvoiceRow
                      key={invoice.id}
                      invoice={invoice}
                      timeZone={timeZoneQuery.data!}
                      isBarber={isBarber}
                      onPayment={() => openPayment(invoice)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {pagination && pagination.totalPages > 1 && (
            <nav
              className="mt-5 flex items-center justify-between gap-4"
              aria-label="Paginación de facturas"
            >
              <p className="text-sm text-[var(--dash-text-muted)]">
                Página {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  tone="light"
                  variant="secondary"
                  disabled={page <= 1 || invoicesQuery.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </Button>
                <Button
                  tone="light"
                  variant="secondary"
                  disabled={page >= pagination.totalPages || invoicesQuery.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </nav>
          )}
        </>
      )}

      {selectedInvoice && (
        <Modal
          tone="light"
          title="Registrar cobro completo"
          onClose={() => {
            if (!paymentMutation.isPending) setSelectedInvoice(null);
          }}
        >
          <div className="space-y-4">
            <div className="rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-4">
              <p className="text-sm font-medium text-[var(--dash-text)]">
                {selectedInvoice.booking.clientName} · {selectedInvoice.booking.serviceName}
              </p>
              <p className="mt-1 text-sm text-[var(--dash-text-muted)]">
                Importe fijo: {formatDopAmount(selectedInvoice.amount)}
              </p>
            </div>
            <SelectField
              tone="light"
              label="Método de pago"
              name="paymentMethod"
              value={paymentMethod}
              disabled={paymentMutation.isPending}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            >
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </SelectField>
            <p className="text-sm text-[var(--dash-text-muted)]">
              Se registrará el pago total con la fecha real del servidor. Esta acción no permite editar el importe.
            </p>
            {paymentMutation.isError && (
              <p role="alert" className="text-sm text-[var(--dash-danger)]">
                {invoiceErrorMessage(paymentMutation.error, "payment")}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                tone="light"
                variant="ghost"
                disabled={paymentMutation.isPending}
                onClick={() => setSelectedInvoice(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                tone="light"
                disabled={paymentMutation.isPending}
                onClick={recordPayment}
              >
                {paymentMutation.isPending ? "Registrando…" : "Confirmar cobro"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InvoiceRow({ invoice, timeZone, isBarber, onPayment }: {
  invoice: Invoice;
  timeZone: string;
  isBarber: boolean;
  onPayment: () => void;
}) {
  return (
    <tr>
      <td className="px-4 py-4">
        <p className="font-medium">{invoice.booking.clientName}</p>
        <p className="mt-0.5 text-xs text-[var(--dash-text-muted)]">
          {formatBusinessDateTime(invoice.booking.startTime, timeZone)}
        </p>
      </td>
      <td className="px-4 py-4">{invoice.booking.serviceName}</td>
      {!isBarber && <td className="px-4 py-4">{invoice.booking.professionalName}</td>}
      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold">{formatDopAmount(invoice.amount)}</td>
      <td className="px-4 py-4"><Badge tone="light" status={invoice.state} /></td>
      <td className="px-4 py-4">
        {invoice.payment ? (
          <>
            <p>{PAYMENT_METHOD_LABELS[invoice.payment.method]}</p>
            <p className="mt-0.5 text-xs text-[var(--dash-text-muted)]">{formatBusinessDateTime(invoice.payment.paidAt, timeZone)}</p>
          </>
        ) : (
          <span className="text-[var(--dash-text-muted)]">Pendiente</span>
        )}
      </td>
      <td className="px-4 py-4 text-right">
        {invoice.state === "ISSUED" && <Button tone="light" className="whitespace-nowrap" onClick={onPayment}>Registrar cobro</Button>}
      </td>
    </tr>
  );
}

function InvoiceCard({ invoice, timeZone, isBarber, onPayment }: {
  invoice: Invoice;
  timeZone: string;
  isBarber: boolean;
  onPayment: () => void;
}) {
  return (
    <Card tone="light" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--dash-text)]">{invoice.booking.clientName}</p>
          <p className="mt-0.5 text-sm text-[var(--dash-text-muted)]">{invoice.booking.serviceName}</p>
        </div>
        <Badge tone="light" status={invoice.state} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="col-span-2">
          <dt className="text-xs text-[var(--dash-text-muted)]">Reserva</dt>
          <dd className="mt-0.5 text-[var(--dash-text)]">{formatBusinessDateTime(invoice.booking.startTime, timeZone)}</dd>
        </div>
        {!isBarber && (
          <div>
            <dt className="text-xs text-[var(--dash-text-muted)]">Profesional</dt>
            <dd className="mt-0.5 text-[var(--dash-text)]">{invoice.booking.professionalName}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-[var(--dash-text-muted)]">Importe</dt>
          <dd className="mt-0.5 font-semibold text-[var(--dash-text)]">{formatDopAmount(invoice.amount)}</dd>
        </div>
        {invoice.payment && (
          <div className="col-span-2">
            <dt className="text-xs text-[var(--dash-text-muted)]">Cobro</dt>
            <dd className="mt-0.5 text-[var(--dash-text)]">
              {PAYMENT_METHOD_LABELS[invoice.payment.method]} · {formatBusinessDateTime(invoice.payment.paidAt, timeZone)}
            </dd>
          </div>
        )}
      </dl>
      {invoice.state === "ISSUED" && (
        <Button tone="light" className="mt-4 min-h-11 w-full" onClick={onPayment}>Registrar cobro</Button>
      )}
    </Card>
  );
}
