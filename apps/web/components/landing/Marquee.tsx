export function Marquee() {
  const STUDIOS = [
    { name: "Mendoza Barber Studio", city: "Santo Domingo" },
    { name: "The Craft Club", city: "Santiago" },
    { name: "Élite Grooming Lounge", city: "La Romana" },
    { name: "Herrera Barbershop", city: "Piantini" },
    { name: "Signature Cuts", city: "Bella Vista" },
    { name: "Black Oak Studio", city: "Naco" },
    { name: "Urban Barbers Co.", city: "San Cristóbal" },
  ];

  const row = (
    <div className="flex shrink-0 items-center gap-12 pr-12" aria-hidden>
      {STUDIOS.map((studio) => (
        <div key={studio.name} className="flex items-center gap-4">
          <span className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-medium tracking-tight text-[var(--color-paper)]/80 hover:text-[var(--color-paper)] transition-colors">
            {studio.name}
          </span>
          <span className="text-[11px] font-mono text-[var(--color-faint)]">
            ({studio.city})
          </span>
          <span className="text-[var(--color-brass)] text-xs ml-4">✦</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="border-y border-[var(--color-border)] bg-[var(--color-surface)]/30 py-5 overflow-hidden group">
      <div className="flex w-max animate-[marquee_40s_linear_infinite] motion-reduce:animate-none group-hover:[animation-play-state:paused] cursor-default">
        {row}
        {row}
      </div>
    </div>
  );
}
