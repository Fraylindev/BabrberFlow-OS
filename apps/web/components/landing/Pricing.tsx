import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "./Section";

const PLANS = [
  {
    name: "Starter",
    price: "RD$1,490",
    period: "/mes",
    description: "Para una barbería que empieza a organizarse en serio.",
    features: [
      "1 sucursal",
      "Hasta 3 profesionales",
      "Reservas y agenda",
      "Página pública de reservas",
    ],
    featured: false,
  },
  {
    name: "Pro",
    price: "RD$2,990",
    period: "/mes",
    description: "Para el negocio que ya tiene equipo y quiere control real.",
    features: [
      "1 sucursal",
      "Profesionales ilimitados",
      "Roles por persona",
      "Facturación integrada",
      "Soporte prioritario",
    ],
    featured: true,
  },
  {
    name: "Business",
    price: "A medida",
    period: "",
    description: "Para cadenas con varias sucursales y necesidades propias.",
    features: [
      "Múltiples sucursales",
      "Reportes avanzados",
      "Onboarding asistido",
      "Acuerdo de nivel de servicio",
    ],
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="planes" className="px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Precios"
        title="Un plan para cada tamaño de barbería"
        description="Sin letra pequeña. Cambia o cancela cuando quieras."
      />
      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={`flex flex-col p-6 ${plan.featured ? "border-[var(--color-brass)]" : ""}`}
          >
            {plan.featured && (
              <span className="mb-3 inline-block w-fit rounded-full bg-[var(--color-brass)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink)]">
                Más elegido
              </span>
            )}
            <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
              {plan.name}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{plan.description}</p>
            <p className="mt-5 font-[family-name:var(--font-mono)] text-3xl text-[var(--color-paper)]">
              {plan.price}
              <span className="text-sm text-[var(--color-muted)]">{plan.period}</span>
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <span className="text-[var(--color-brass)]">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="mt-6">
              <Button
                variant={plan.featured ? "primary" : "secondary"}
                className="w-full"
              >
                Empezar
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
