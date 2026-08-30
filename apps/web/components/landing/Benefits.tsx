import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { BRAND } from "@/lib/brand";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LANDING_PHOTOS } from "@/lib/landing-photos";
import { SectionHeading } from "./Section";

const BENEFITS = [
  {
    title: "Cero fricción para reservar",
    description:
      "Tu cliente reserva desde el navegador, sin bajar una app ni llamar al negocio.",
    goal: "Objetivo: convertir visitas en citas",
    span: "lg:col-span-2",
  },
  {
    title: "Tu marca al frente",
    description:
      "Tu barbería tiene su propia página de reservas. Kortek es la infraestructura, no el protagonista.",
    goal: "Objetivo: construir tu marca, no la nuestra",
    span: "",
  },
  {
    title: "Todo en un solo lugar",
    description:
      "Agenda, equipo, clientes y facturación en un panel, sin saltar entre cinco herramientas distintas.",
    goal: "Objetivo: ahorrar tiempo operativo",
    span: "",
  },
];

export function Benefits() {
  return (
    <section id="beneficios" className="py-20 sm:py-28">
      <Container size="wide">
        <SectionHeading
          eyebrow={`Por qué ${BRAND.name}`}
          title="Menos fricción, más sillas ocupadas"
        />
        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 80} className={b.span}>
              <Card interactive className="h-full p-6">
                <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[var(--color-brass)]">
                  {b.goal}
                </p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-paper)]">
                  {b.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{b.description}</p>
              </Card>
            </Reveal>
          ))}

          {/* Celda fotográfica — rompe la monotonía de tarjetas de texto */}
          <Reveal delay={240} className="lg:col-span-3">
            <div className="group relative flex h-64 items-end overflow-hidden rounded-sm border border-[var(--color-border-strong)] sm:h-80">
              <Image
                src={LANDING_PHOTOS.clippers.src}
                alt={LANDING_PHOTOS.clippers.alt}
                fill
                sizes="100vw"
                className="cinematic-grade object-cover transition-transform duration-[1200ms] ease-[var(--ease-out)] group-hover:scale-105"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,0.9)_0%,rgba(10,10,10,0.2)_55%,transparent_100%)]"
              />
              <p className="relative max-w-xs p-6 font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)] sm:p-10 sm:text-2xl">
                Diseñado para el ritmo real de una barbería, no para una demo.
              </p>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
