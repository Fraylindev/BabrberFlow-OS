export function Card({
  children,
  className = "",
  interactive = false,
  tone = "dark",
}: {
  children: React.ReactNode;
  className?: string;
  /** Eleva la tarjeta y resalta el borde al pasar el mouse/foco — solo
   * para tarjetas que en sí son un control (link, botón). El resto de
   * la app la sigue usando tal cual, sin cambio de comportamiento. */
  interactive?: boolean;
  /** "dark" (por defecto, tema de marketing/módulos aún sin migrar) o
   * "light" (tema claro del Backoffice) — cada módulo elige el suyo
   * hasta que todos migren al tema claro. Las clases van completas y
   * literales por tono a propósito: Tailwind necesita verlas enteras
   * en el código fuente para generarlas, componerlas en runtime con
   * template strings no funciona. */
  tone?: "dark" | "light";
}) {
  if (tone === "light") {
    return (
      <div
        className={`rounded-sm border border-[var(--dash-border)] bg-[var(--dash-surface)] ${
          interactive
            ? "transition-[transform,box-shadow,border-color] duration-[var(--duration-base)] ease-[var(--ease-out)] hover:-translate-y-1 hover:border-[var(--dash-border-strong)] hover:shadow-[var(--dash-shadow-raised)] focus-within:-translate-y-1 focus-within:shadow-[var(--dash-shadow-raised)]"
            : ""
        } ${className}`}
      >
        {children}
      </div>
    );
  }

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
