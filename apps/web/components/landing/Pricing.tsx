"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "./Section";

const PLANS = [
  {
    name: "Starter",
    monthly: 1490,
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
    monthly: 2990,
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
];

const money = (n: number) => `RD$${n.toLocaleString("es-DO")}`;

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="planes" className="py-20 sm:py-28">
      <Container size="wide">
        <SectionHeading
          eyebrow="Precios"
          title="Un plan para cada tamaño de barbería"
          description="Sin letra pequeña. Cambia o cancela cuando quieras."
        />

        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={`text-sm ${!annual ? "text-[var(--color-paper)]" : "text-[var(--color-muted)]"}`}>
            Mensual
          </span>
          <button
            role="switch"
            aria-checked={annual}
            aria-label="Cambiar a facturación anual"
            onClick={() => setAnnual((v) => !v)}
            className="relative h-6 w-11 shrink-0 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] transition-colors duration-[var(--duration-base)]"
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--color-brass)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)] ${
                annual ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className={`text-sm ${annual ? "text-[var(--color-paper)]" : "text-[var(--color-muted)]"}`}>
            Anual <span className="text-[var(--color-brass)]">· 2 meses gratis</span>
          </span>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
          {PLANS.map((plan, i) => {
            const price = annual ? Math.round((plan.monthly * 10) / 12) : plan.monthly;
            return (
              <Reveal key={plan.name} delay={i * 100}>
                <Card
                  interactive
                  className={`flex h-full flex-col p-6 ${
                    plan.featured ? "border-[var(--color-brass)] shadow-[var(--shadow-card)]" : ""
                  }`}
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
                    {money(price)}
                    <span className="text-sm text-[var(--color-muted)]">/mes</span>
                  </p>
                  {annual && (
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Facturado {money(plan.monthly * 10)} al año
                    </p>
                  )}
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
              </Reveal>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
          ¿Tienes varias sucursales o necesidades a medida?{" "}
          <a href="#faq" className="text-[var(--color-brass)] hover:underline">
            Hablemos.
          </a>
        </p>
      </Container>
    </section>
  );
}
