import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LANDING_PHOTOS } from "@/lib/landing-photos";
import { BRAND } from "@/lib/brand";

export function CTASection() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36 border-t border-[var(--color-border)]">
      {/* Fondo cinematográfico con gradiente */}
      <Image
        src={LANDING_PHOTOS.storyInterior.src}
        alt=""
        fill
        sizes="100vw"
        className="cinematic-grade object-cover opacity-20"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[var(--color-ink)] via-[var(--color-ink)]/90 to-[var(--color-ink)]"
      />
      <div className="bg-grid-subtle absolute inset-0 opacity-40" />
      <div aria-hidden className="film-grain absolute inset-0" />

      {/* Resplandor carmesí central */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(225,29,46,0.25)_0%,rgba(0,0,0,0)_65%)] blur-[90px]"
      />

      <Container className="relative text-center max-w-4xl">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-4 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-md shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Configuración Inmediata · Sin Tarjeta Requerida</span>
          </span>

          <h2 className="mt-8 font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--color-paper)] leading-[1.08]">
            Tu barbería merece operar con el mismo nivel de excelencia con el que cortas.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[var(--color-muted)] leading-relaxed">
            Deja atrás el caos de las notas en papel y los mensajes perdidos en WhatsApp. Dale a tu negocio y a tus clientes la experiencia premium de Kortek Booking.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto px-9 py-4 text-sm font-semibold uppercase tracking-wider shadow-xl shadow-[rgba(225,29,46,0.35)] hover:shadow-[0_0_35px_-4px_rgba(225,29,46,0.8)]">
                Comenzar prueba gratis de 14 días →
              </Button>
            </Link>
            <a
              href={BRAND.contact.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button variant="secondary" className="w-full sm:w-auto px-7 py-4 text-sm font-medium uppercase tracking-wider">
                Hablar con un asesor por WhatsApp
              </Button>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--color-faint)]">
            <span>✓ Activación en 3 minutos</span>
            <span>✓ Sin contratos de permanencia</span>
            <span>✓ Soporte técnico directo</span>
            <span>✓ Tus datos 100% aislados</span>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
