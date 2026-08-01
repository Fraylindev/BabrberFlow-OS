import { Card } from "@/components/ui/Card";
import { SectionHeading } from "./Section";

// Testimonios de ejemplo (mock) — nombres y negocios ficticios, sin fotos
// de personas reales, para el lanzamiento inicial de la landing.
const TESTIMONIALS = [
  {
    quote:
      "Dejamos de perder citas por WhatsApp desordenado. Ahora todo el equipo ve la misma agenda.",
    name: "M. Reyes",
    role: "Dueña, Studio Reyes",
  },
  {
    quote:
      "Mis clientes reservan solos desde el teléfono. Yo solo abro el panel y veo el día armado.",
    name: "J. Almonte",
    role: "Barbero independiente",
  },
  {
    quote:
      "Poder separar lo que ve cada barbero de lo que veo yo como dueño cambió cómo manejamos el negocio.",
    name: "C. Ventura",
    role: "Dueño, Ventura Barbershop",
  },
];

export function Testimonials() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="Quién ya lo usa" title="Barberías que ya organizaron su agenda" />
      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <Card key={t.name} className="flex flex-col p-6">
            <p className="flex-1 text-sm leading-relaxed text-[var(--color-paper)]">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-strong)] font-[family-name:var(--font-display)] text-xs text-[var(--color-brass)]">
                {t.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <p className="text-sm text-[var(--color-paper)]">{t.name}</p>
                <p className="text-xs text-[var(--color-muted)]">{t.role}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
