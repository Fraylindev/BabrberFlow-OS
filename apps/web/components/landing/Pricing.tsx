"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { WhatsAppIcon } from "@/components/ui/SocialIcons";
import { BRAND } from "@/lib/brand";
import { SectionHeading } from "./Section";

const PLANS = [
  {
    name: "Estándar",
    monthly: 29,
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
    monthly: 59,
    description: "Todo lo del plan Estándar, más funciones premium para negocios con equipo.",
    features: [
      "Todo lo del plan Estándar",
      "Profesionales ilimitados",
      "Roles por persona",
      "Facturación integrada",
      "Soporte prioritario",
    ],
    featured: true,
  },
];

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

        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setAnnual(false)}
            aria-pressed={!annual}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors duration-[var(--duration-base)] ${
              !annual
                ? "bg-[var(--color-brass)] text-white"
                : "text-[var(--color-muted)] hover:text-[var(--color-paper)]"
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setAnnual(true)}
            aria-pressed={annual}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors duration-[var(--duration-base)] ${
              annual
                ? "bg-[var(--color-brass)] text-white"
                : "text-[var(--color-muted)] hover:text-[var(--color-paper)]"
            }`}
          >
            Anual <span className="opacity-80">· 1 mes gratis</span>
          </button>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
          {PLANS.map((plan, i) => {
            const price = annual ? Math.round((plan.monthly * 11) / 12) : plan.monthly;
            return (
              <Reveal key={plan.name} delay={i * 100}>
                <Card
                  interactive
                  className={`flex h-full flex-col p-6 ${
                    plan.featured
                      ? "border-[var(--color-brass)] shadow-[var(--shadow-glow)]"
                      : ""
                  }`}
                >
                  {plan.featured && (
                    <span className="mb-3 inline-block w-fit rounded-full bg-[var(--color-brass)] px-2.5 py-1 text-xs font-medium text-white">
                      Más elegido
                    </span>
                  )}
                  <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{plan.description}</p>

                  <p className="mt-5 flex items-baseline gap-1 font-[family-name:var(--font-mono)] text-4xl text-[var(--color-paper)]">
                    <span className="text-lg text-[var(--color-muted)]">US$</span>
                    <span
                      key={annual ? "annual" : "monthly"}
                      className="transition-opacity duration-[var(--duration-base)] ease-[var(--ease-out)]"
                      style={{ animation: "fade-price var(--duration-base) var(--ease-out)" }}
                    >
                      {price}
                    </span>
                    <span className="text-sm text-[var(--color-muted)]">/mes</span>
                  </p>
                  {annual && (
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Facturado US${plan.monthly * 11} al año
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

        <Reveal delay={200} className="mt-12 flex justify-center">
          <a
            href={BRAND.contact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-3 transition-colors duration-[var(--duration-base)] hover:border-[var(--color-brass)]"
          >
            <WhatsAppIcon className="h-5 w-5 text-[var(--color-brass)]" />
            <span className="text-sm text-[var(--color-paper)]">
              ¿Varias sucursales o necesidades a medida?{" "}
              <span className="font-medium text-[var(--color-brass)] group-hover:underline">
                Hablemos por WhatsApp
              </span>
            </span>
          </a>
        </Reveal>
      </Container>
    </section>
  );
}
