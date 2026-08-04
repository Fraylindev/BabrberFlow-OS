function formatDelta(current: number, previous: number): { pct: number; up: boolean } | null {
  if (previous === 0) {
    if (current === 0) return null;
    return { pct: 100, up: true };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
}

/**
 * Cifra + comparación contra un valor de referencia (ej. ayer). Nativo
 * del tema claro del Backoffice (--dash-*) — a diferencia de Card,
 * PageHeader, EmptyState y Badge, este componente no tiene consumidores
 * en el tema oscuro todavía, así que no necesita una variante "dark".
 */
export function TrendStat({
  label,
  value,
  displayValue,
  previousValue,
  previousLabel,
  className = "",
}: {
  label: string;
  /** Valor numérico crudo, usado para calcular el delta. */
  value: number;
  /** Cómo mostrar `value` (ya formateado: moneda, unidades, etc.). */
  displayValue: string;
  previousValue?: number;
  previousLabel?: string;
  className?: string;
}) {
  const delta = previousValue !== undefined ? formatDelta(value, previousValue) : null;

  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--dash-text-muted)]">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-[family-name:var(--font-mono)] text-3xl text-[var(--dash-text)]">
          {displayValue}
        </p>
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              delta.up ? "text-[var(--dash-success)]" : "text-[var(--dash-danger)]"
            }`}
          >
            {delta.up ? "↑" : "↓"} {delta.pct}%
          </span>
        )}
      </div>
      {previousLabel && (
        <p className="mt-0.5 text-xs text-[var(--dash-text-faint)]">{previousLabel}</p>
      )}
    </div>
  );
}
