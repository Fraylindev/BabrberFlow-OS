import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { LANDING_PHOTOS } from "@/lib/landing-photos";

const STAT_BENEFITS = [
  {
    metric: "+35%",
    label: "Aumento en Citas Confirmadas",
    description:
      "Tus clientes reservan cuando quieren, incluso de noche cuando tu local está cerrado. No pierdes turnos por no contestar a tiempo.",
    highlight: "Conversión sin fricción",
  },
  {
    metric: "15 hrs",
    label: "Ahorradas a la Semana",
    description:
      "Elimina las cadenas eternas de WhatsApp '¿a qué hora tienes libre?'. El cliente ve la disponibilidad en vivo y elige solo.",
    highlight: "Eficiencia operativa",
  },
  {
    metric: "0",
    label: "Choques o Citas Duplicadas",
    description:
      "El motor de reserva valida la disponibilidad del sillón y del barbero en milisegundos. Dos clientes jamás se citarán en el mismo turno.",
    highlight: "Agenda matemática",
  },
  {
    metric: "100%",
    label: "Control de Caja y Comisiones",
    description:
      "Cobros directos desde la cita completada y cálculo instantáneo de la liquidación de cada profesional. Cierre de caja en 3 minutos.",
    highlight: "Finanzas transparentes",
  },
];

export function Benefits() {
  return (
    <section id="beneficios" className="py-24 sm:py-32 relative">
      <Container size="wide">
        <Reveal>
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-brass)] font-semibold uppercase tracking-wider mb-4">
              Retorno de Inversión Inmediato
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--color-paper)] leading-tight">
              Menos tiempo al teléfono,{" "}
              <span className="text-[var(--color-brass)]">más sillas produciendo.</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[var(--color-muted)]">
              El verdadero costo de una agenda desordenada son los turnos vacíos y el desgaste del equipo. Kortek Booking se paga solo desde la primera semana.
            </p>
          </div>
        </Reveal>

        {/* 4 Métricas Cuantificadas */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STAT_BENEFITS.map((item, idx) => (
            <Reveal key={item.metric} delay={idx * 60}>
              <div className="h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7 flex flex-col justify-between hover:border-[var(--color-border-strong)] transition-all duration-300 shadow-[var(--shadow-card)]">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-brass)] font-semibold">
                    {item.highlight}
                  </span>
                  <div className="mt-4 font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-[var(--color-paper)]">
                    {item.metric}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-[var(--color-paper)]">
                    {item.label}
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
                    {item.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Banner Fotográfico Cinematográfico */}
        <Reveal delay={240}>
          <div className="mt-12 group relative overflow-hidden rounded-2xl border border-[var(--color-border-strong)] min-h-[340px] sm:min-h-[400px] flex items-end">
            <Image
              src={LANDING_PHOTOS.clippers.src}
              alt={LANDING_PHOTOS.clippers.alt}
              fill
              sizes="100vw"
              className="cinematic-grade object-cover transition-transform duration-[1200ms] ease-[var(--ease-out)] group-hover:scale-105"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)] via-[var(--color-ink)]/70 to-transparent sm:bg-gradient-to-r sm:from-[var(--color-ink)] sm:via-[var(--color-ink)]/60 sm:to-transparent"
            />
            <div className="relative z-10 p-8 sm:p-12 max-w-xl">
              <span className="rounded-full bg-[var(--color-brass)]/20 border border-[var(--color-brass)]/40 px-3 py-1 text-xs font-semibold text-[var(--color-brass)]">
                Diseño Artesanal + Tecnología
              </span>
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[var(--color-paper)] leading-tight">
                Construido para el ritmo diario de tu salón, no para una presentación teórica.
              </h3>
              <p className="mt-3 text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                Tus barberos lo aprenden a usar en 5 minutos en sus propios teléfonos. Tus clientes no tienen que registrarse para reservar.
              </p>
              <div className="mt-6">
                <Link href="/register">
                  <Button className="px-6 py-2.5 text-xs uppercase tracking-wider font-semibold">
                    Pruébalo en tu barbería gratis →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
