const styles: Record<string, string> = {
  // Bookings
  PENDING: "text-[var(--color-pending)] bg-[var(--color-pending-bg)]",
  CONFIRMED: "text-[var(--color-brass)] bg-[var(--color-brass-dim)]/20",
  COMPLETED: "text-[var(--color-success)] bg-[var(--color-success-bg)]",
  CANCELLED: "text-[var(--color-danger)] bg-[var(--color-danger-bg)]",
  NO_SHOW: "text-[var(--color-danger)] bg-[var(--color-danger-bg)]",
  // Invoices
  UNPAID: "text-[var(--color-pending)] bg-[var(--color-pending-bg)]",
  PAID: "text-[var(--color-success)] bg-[var(--color-success-bg)]",
  REFUNDED: "text-[var(--color-muted)] bg-[var(--color-surface-raised)]",
};

const labels: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
  UNPAID: "Sin pagar",
  PAID: "Pagada",
  REFUNDED: "Reembolsada",
};

export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${
        styles[status] || "text-[var(--color-muted)] bg-[var(--color-surface-raised)]"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
