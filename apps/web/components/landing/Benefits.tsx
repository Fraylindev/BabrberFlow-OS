import { Card } from "@/components/ui/Card";
import { SectionHeading } from "./Section";

const BENEFITS = [
  {
    title: "Cero fricción para reservar",
    description:
      "Tu cliente reserva en menos de un minuto, sin bajar ninguna app ni llenar formularios eternos.",
  },
  {
    title: "Tu marca al frente",
    description:
      "Tu barbería tiene su propia página de reservas — Kortek es la infraestructura, no el protagonista.",
  },
  {
    title: "Todo en un solo lugar",
    description:
      "Agenda, equipo, clientes y facturación en un panel, sin saltar entre cinco herramientas distintas.",
  },
  {
    title: "Aislamiento real por negocio",
    description:
      "Arquitectura multi-tenant desde el diseño: los datos de tu barbería nunca se mezclan con los de nadie más.",
  },
];

export function Benefits() {
  return (
    <section id="beneficios" className="px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Por qué Kortek"
        title="Menos fricción, más sillas ocupadas"
      />
      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2">
        {BENEFITS.map((b) => (
          <Card key={b.title} className="p-6">
            <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-paper)]">
              {b.title}
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{b.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
