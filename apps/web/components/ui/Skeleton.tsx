export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-sm bg-[var(--color-surface-raised)] ${className}`}
    />
  );
}

// Skeleton listo para el patrón más común de la app: una lista de filas
// dentro de un Card (usado en las páginas de Reservas, Clientes, etc.)
export function SkeletonListRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[var(--color-border)]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}
