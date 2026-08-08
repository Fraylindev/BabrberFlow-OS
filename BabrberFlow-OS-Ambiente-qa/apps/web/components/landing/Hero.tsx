import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LANDING_PHOTOS } from "@/lib/landing-photos";

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden">
      <Image
        src={LANDING_PHOTOS.heroInterior.src}
        alt={LANDING_PHOTOS.heroInterior.alt}
        fill
        priority
        sizes="100vw"
        className="cinematic-grade object-cover"
      />
      {/* Velo negro con acento rojo en la base — la gradación se hace
          una sola vez a nivel de imagen (.cinematic-grade); este overlay
          solo controla legibilidad y el resplandor de marca. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.35)_0%,rgba(10,10,10,0.55)_40%,var(--color-ink)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{ background: "linear-gradient(0deg, rgba(225,29,46,0.18), transparent)" }}
      />
      <div aria-hidden className="film-grain absolute inset-0" />

      <Container size="wide" className="relative w-full pb-20 pt-40 sm:pb-28">
        <Reveal className="max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brass)]/40 bg-[var(--color-ink)]/50 px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-brass)] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brass)]" />
            Para barberías que se toman en serio su negocio
          </span>

          <h1 className="mt-7 font-[family-name:var(--font-display)] text-6xl font-semibold leading-[0.94] text-[var(--color-paper)] sm:text-7xl lg:text-8xl">
            Tu barbería,
            <br />
            organizada <span className="text-[var(--color-brass)]">de verdad.</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg text-[var(--color-paper)]/75 sm:text-xl">
            Reservas sin fricción para tus clientes, un panel real para tu equipo,
            y los números claros para ti. Con tu marca al frente, siempre.
          </p>

          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link href="/register">
              <Button className="w-full px-8 py-4 text-base sm:w-auto">
                Registra tu barbería gratis
              </Button>
            </Link>
            <a
              href="#planes"
              className="text-sm font-medium text-[var(--color-paper)] underline decoration-[var(--color-brass)] underline-offset-4 transition-colors hover:text-[var(--color-brass)]"
            >
              Ver planes →
            </a>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
