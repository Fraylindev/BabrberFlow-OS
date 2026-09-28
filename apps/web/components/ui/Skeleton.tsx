export function Skeleton({
  className = "",
  tone = "dark",
}: {
  className?: string;
  /** "dark" (por defecto) o "light" — ver nota en Card.tsx. */
  tone?: "dark" | "light";
}) {
  const isLight = tone === "light";
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-md ${
        isLight ? "bg-[var(--dash-surface-raised)]" : "bg-[var(--color-surface-raised)]"
      } ${className}`}
    >
      <div
        className={`absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] ${
          isLight
            ? "bg-gradient-to-r from-transparent via-black/[0.05] to-transparent"
            : "bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
        }`}
      />
    </div>
  );
}

// Skeleton listo para el patrón más común de la app: una lista de filas
// dentro de un Card (usado en las páginas de Reservas, Clientes, etc.)
export function SkeletonListRows({
  rows = 4,
  tone = "dark",
}: {
  rows?: number;
  tone?: "dark" | "light";
}) {
  const divider = tone === "light" ? "divide-[var(--dash-border)]" : "divide-[var(--color-border)]";
  return (
    <div className={`divide-y ${divider}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-4">
          <div className="flex flex-col gap-2">
            <Skeleton tone={tone} className="h-4 w-40" />
            <Skeleton tone={tone} className="h-3 w-24" />
          </div>
          <Skeleton tone={tone} className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}
