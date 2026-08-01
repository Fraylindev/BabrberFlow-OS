import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LANDING_PHOTOS } from "@/lib/landing-photos";

export function Hero() {
  return (
    <section className="relative min-h-[92vh] overflow-hidden">
      {/* Fondo fotográfico a sangre completa, no un panel de color plano */}
      <Image
        src={LANDING_PHOTOS.heroInterior.src}
        alt={LANDING_PHOTOS.heroInterior.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,8,5,0.55)_0%,rgba(10,8,5,0.75)_45%,var(--color-ink)_100%)]"
      />
      <div aria-hidden className="leather-grain absolute inset-0" />

      <Container size="wide" className="relative flex min-h-[92vh] flex-col justify-end pb-16 pt-32 sm:pb-24">
        <Reveal className="max-w-3xl">
          <span className="inline-block rounded-full border border-[var(--color-brass)]/50 bg-[var(--color-ink)]/60 px-3 py-1 text-xs text-[var(--color-brass)] backdrop-blur">
            Para barberías y salones que quieren verse tan bien como cortan
          </span>

          <h1 className="mt-6 font-[family-name:var(--font-display)] text-5xl font-semibold leading-[0.98] text-[var(--color-paper)] sm:text-6xl lg:text-7xl">
            Tu barbería,
            <br />
            <span className="text-[var(--color-brass)]">organizada de verdad.</span>
          </h1>

          <p className="mt-6 max-w-lg text-base text-[var(--color-paper)]/80 sm:text-lg">
            Reservas sin fricción para tus clientes, un panel real para tu equipo,
            y los números claros para ti. Con tu marca al frente, siempre.
          </p>

          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link href="/register">
              <Button className="w-full px-6 py-3 text-base sm:w-auto">
                Registra tu barbería gratis
              </Button>
            </Link>
            <a href="#planes">
              <Button variant="secondary" className="w-full border-[var(--color-paper)]/30 bg-[var(--color-ink)]/50 px-6 py-3 text-base backdrop-blur sm:w-auto">
                Ver planes
              </Button>
            </a>
          </div>
        </Reveal>
      </Container>

      {/* Tarjeta flotante del producto, superpuesta al borde de la foto —
          rompe la composición plana y da profundidad real. */}
      <Reveal
        delay={200}
        className="absolute bottom-0 right-4 z-10 hidden w-[22rem] -translate-y-10 rotate-1 sm:block lg:right-16"
      >
        <div className="rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-raised)] transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)] hover:rotate-0">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <p className="font-[family-name:var(--font-display)] text-sm text-[var(--color-paper)]">
              Agenda de hoy
            </p>
            <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">
              Elite Barber Shop
            </span>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-[var(--color-border)]">
            {[
              { client: "Josué M.", detail: "Corte + barba con Ana", time: "10:00 AM", status: "CONFIRMED" },
              { client: "Ramón P.", detail: "Fade clásico con Luis", time: "11:30 AM", status: "PENDING" },
            ].map((row) => (
              <div key={row.client} className="flex items-center justify-between py-3">
                <div className="text-left">
                  <p className="text-sm text-[var(--color-paper)]">{row.client}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {row.time} · {row.detail}
                  </p>
                </div>
                <Badge status={row.status} />
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
