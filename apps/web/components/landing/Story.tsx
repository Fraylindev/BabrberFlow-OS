import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LANDING_PHOTOS } from "@/lib/landing-photos";

const CHAOS = [
  "Un cuaderno para las citas de mañana",
  "Otro grupo de WhatsApp para \"confirmar\" horarios",
  "Un Excel que solo entiende quien lo hizo",
  "Clientes que llaman porque nadie contestó el mensaje",
];

const ORDER = [
  "Una sola agenda, la misma para todo el equipo",
  "El cliente reserva solo, sin escribirle a nadie",
  "Los choques de horario se detectan solos",
  "Tú ves el negocio completo desde un panel",
];

export function Story() {
  return (
    <section className="py-24 sm:py-32">
      <Container size="wide" className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
        <Reveal className="relative aspect-[4/5] overflow-hidden rounded-sm border border-[var(--color-border-strong)] lg:order-2">
          <Image
            src={LANDING_PHOTOS.storyInterior.src}
            alt={LANDING_PHOTOS.storyInterior.alt}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="cinematic-grade object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(0deg,rgba(10,10,10,0.65)_0%,transparent_55%)]"
          />
          <div className="film-grain absolute inset-0" aria-hidden />
        </Reveal>

        <div className="lg:order-1">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-brass)]">
              El problema real
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight text-[var(--color-paper)] sm:text-4xl">
              Manejar una barbería no debería sentirse como apagar incendios todo el día.
            </h2>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <Reveal delay={80}>
              <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--color-faint)]">
                Sin Kortek Booking
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {CHAOS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
                    <span aria-hidden className="mt-0.5 text-[var(--color-danger)]">✕</span>
                    <span className="line-through decoration-[var(--color-danger)]/40">{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={160}>
              <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--color-brass)]">
                Con Kortek Booking
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {ORDER.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[var(--color-paper)]">
                    <span aria-hidden className="mt-0.5 text-[var(--color-brass)]">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
