const ITEMS = [
  "Reservas sin llamadas",
  "Agenda sin choques de horario",
  "Tu marca, no la nuestra",
  "Roles por persona",
  "Facturación integrada",
  "Datos aislados por negocio",
];

/**
 * Marquesina CSS pura (keyframes + duplicación del contenido), sin
 * librería de carrusel. `prefers-reduced-motion` ya congela las
 * animaciones globalmente en globals.css.
 */
export function Marquee() {
  const row = (
    <div className="flex shrink-0 items-center gap-10 pr-10" aria-hidden>
      {ITEMS.map((item) => (
        <span
          key={item}
          className="flex items-center gap-10 font-[family-name:var(--font-display)] text-2xl text-[var(--color-muted)] sm:text-3xl"
        >
          {item}
          <span className="text-[var(--color-brass)]">✦</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden border-y border-[var(--color-border)] bg-[var(--color-surface)]/40 py-6">
      <div className="flex w-max animate-[marquee_32s_linear_infinite] motion-reduce:animate-none">
        {row}
        {row}
      </div>
    </div>
  );
}
