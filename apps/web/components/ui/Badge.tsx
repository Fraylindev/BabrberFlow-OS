const DARK_STYLES: Record<string, string> = {
  // Bookings
  PENDING: 'text-[var(--color-pending)] bg-[var(--color-pending-bg)]',
  CONFIRMED: 'text-[var(--color-brass)] bg-[var(--color-brass-dim)]/20',
  COMPLETED: 'text-[var(--color-success)] bg-[var(--color-success-bg)]',
  CANCELLED: 'text-[var(--color-danger)] bg-[var(--color-danger-bg)]',
  NO_SHOW: 'text-[var(--color-danger)] bg-[var(--color-danger-bg)]',
  // Invoices
  ISSUED: 'text-[var(--color-pending)] bg-[var(--color-pending-bg)]',
  PAID: 'text-[var(--color-success)] bg-[var(--color-success-bg)]',
};

// Tema claro del Backoffice: fondo tintado suave + texto saturado del
// mismo tono — el patrón estándar de "status pill" en SaaS claros, no
// los chips oscuros que usa DARK_STYLES sobre fondo claro se verían
// fuera de lugar.
const LIGHT_STYLES: Record<string, string> = {
  PENDING: 'text-[#b45309] bg-[#fef3c7]',
  CONFIRMED: 'text-[var(--dash-accent)] bg-[var(--dash-accent-soft)]',
  COMPLETED: 'text-[#15803d] bg-[#dcfce7]',
  CANCELLED: 'text-[#b91c1c] bg-[#fee2e2]',
  NO_SHOW: 'text-[#475569] bg-[#e2e8f0]',
  ISSUED: 'text-[#b45309] bg-[#fef3c7]',
  PAID: 'text-[#15803d] bg-[#dcfce7]',
};

const labels: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
  ISSUED: 'Pendiente de cobro',
  PAID: 'Pagada',
};

export function Badge({
  status,
  tone = 'dark',
}: {
  status: string;
  /** "dark" (por defecto) o "light" — ver nota en Card.tsx. */
  tone?: 'dark' | 'light';
}) {
  const styles = tone === 'light' ? LIGHT_STYLES : DARK_STYLES;
  const fallback =
    tone === 'light'
      ? 'text-[var(--dash-text-muted)] bg-[var(--dash-surface-raised)]'
      : 'text-[var(--color-muted)] bg-[var(--color-surface-raised)]';

  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${
        styles[status] || fallback
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
