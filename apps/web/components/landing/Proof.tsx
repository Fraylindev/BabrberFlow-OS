import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Stat } from "@/components/ui/Stat";
import { Reveal } from "@/components/ui/Reveal";
import { LANDING_PHOTOS } from "@/lib/landing-photos";

export function Proof() {
  return (
    <section className="relative overflow-hidden border-y border-[var(--color-border)] py-24 sm:py-32">
      <Image
        src={LANDING_PHOTOS.vintageInterior.src}
        alt=""
        fill
        sizes="100vw"
        className="cinematic-grade object-cover opacity-40"
      />
      <div aria-hidden className="absolute inset-0 bg-[var(--color-ink)]/80" />
      <div aria-hidden className="film-grain absolute inset-0" />
      {/* Barber pole animado — firma visual secundaria, una sola vez en
          toda la landing */}
      <div
        aria-hidden
        className="barber-pole absolute -right-6 top-0 h-full w-3 opacity-70 sm:w-4"
      />

      <Container size="wide" className="relative">
        <Reveal>
          <p className="max-w-xl font-[family-name:var(--font-display)] text-3xl leading-snug text-[var(--color-paper)] sm:text-4xl">
            Menos archivos. <span className="text-[var(--color-brass)]">Más control.</span>
          </p>
          <p className="mt-4 max-w-lg text-base text-[var(--color-muted)]">
           Creado para resolver los verdaderos obstáculos de una barbería
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-2 gap-10 sm:grid-cols-4">
          <Reveal delay={0}>
            <Stat value="Web" label="reserva sin instalar una app" />
          </Reveal>
          <Reveal delay={60}>
            <Stat value="Separados" label="datos de cada negocio" />
          </Reveal>
          <Reveal delay={120}>
            <Stat value="4 roles" label="dueño, admin, recepción, barbero" />
          </Reveal>
          <Reveal delay={180}>
            <Stat value="1 panel" label="para la operación interna" />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
