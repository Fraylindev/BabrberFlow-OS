import Image from "next/image";
import { SectionHeading } from "./Section";

const BEFORE = [
  "Tres conversaciones de WhatsApp abiertas a la vez",
  "Un cuaderno o una nota en el teléfono como \"agenda oficial\"",
  "Citas dobles que se descubren cuando el cliente ya está en la puerta",
  "Cerrar el día sin saber cuánto se facturó de verdad",
];

const AFTER = [
  "Una sola agenda que ve todo el equipo, en tiempo real",
  "El cliente reserva solo, desde un enlace, sin llamar a nadie",
  "El sistema bloquea automáticamente cualquier choque de horario",
  "Los números del día están listos antes de que cierres la puerta",
];

export function TransformationSection() {
  return (
    <section id="transformacion" className="px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="La transformación"
        title="De apagar incendios a dirigir el negocio"
      />
      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-faint)]">
            Antes
          </p>
          <ul className="mt-4 flex flex-1 flex-col gap-3">
            {BEFORE.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-[var(--color-muted)]">
                <span className="mt-0.5 text-[var(--color-danger)]">×</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex flex-col overflow-hidden border border-[var(--color-brass)]">
          <div className="relative h-40 w-full">
            <Image
              src="https://images.unsplash.com/photo-1672257493626-038f96997ade?w=900&q=80&auto=format&fit=crop"
              alt="Barbería organizada con pared de ladrillo y varias sillas listas"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] to-transparent" />
          </div>
          <div className="flex flex-1 flex-col bg-[var(--color-surface)] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-brass)]">
              Después
            </p>
            <ul className="mt-4 flex flex-1 flex-col gap-3">
              {AFTER.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[var(--color-paper)]">
                  <span className="mt-0.5 text-[var(--color-brass)]">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
