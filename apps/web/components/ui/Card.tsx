export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Eleva la tarjeta y resalta el borde al pasar el mouse/foco — solo
   * para tarjetas que en sí son un control (link, botón). El resto de
   * la app la sigue usando tal cual, sin cambio de comportamiento. */
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] ${
        interactive
          ? "transition-[transform,box-shadow,border-color] duration-[var(--duration-base)] ease-[var(--ease-out)] hover:-translate-y-1 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-raised)] focus-within:-translate-y-1 focus-within:shadow-[var(--shadow-raised)]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
