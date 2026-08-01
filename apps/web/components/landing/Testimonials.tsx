import { Avatar } from "@/components/ui/Avatar";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "./Section";

// Testimonios de ejemplo (mock) — nombres y negocios ficticios, sin fotos
// de personas reales, para el lanzamiento inicial de la landing.
const FEATURED = {
  quote:
    "Dejamos de perder citas por WhatsApp desordenado. Ahora todo el equipo ve la misma agenda, y mis clientes reservan solos desde el teléfono.",
  name: "M. Reyes",
  role: "Dueña, Studio Reyes",
};

const SECONDARY = [
  {
    quote: "Yo solo abro el panel y veo el día armado.",
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
    <section className="py-20 sm:py-28">
      <Container size="wide">
        <SectionHeading eyebrow="Quién ya lo usa" title="Barberías que ya organizaron su agenda" />

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Reveal className="rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 sm:p-10">
            <p className="font-[family-name:var(--font-display)] text-2xl leading-snug text-[var(--color-paper)] sm:text-3xl">
              &ldquo;{FEATURED.quote}&rdquo;
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Avatar name={FEATURED.name} size="md" />
              <div>
                <p className="text-sm text-[var(--color-paper)]">{FEATURED.name}</p>
                <p className="text-xs text-[var(--color-muted)]">{FEATURED.role}</p>
              </div>
            </div>
          </Reveal>

          <div className="flex flex-col gap-6">
            {SECONDARY.map((t, i) => (
              <Reveal
                key={t.name}
                delay={120 + i * 100}
                className="flex-1 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
              >
                <p className="text-sm leading-relaxed text-[var(--color-paper)]">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <Avatar name={t.name} size="sm" />
                  <div>
                    <p className="text-sm text-[var(--color-paper)]">{t.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">{t.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
