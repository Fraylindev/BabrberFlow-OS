"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

export function Pricing() {
  const [annual, setAnnual] = useState(true);

  const PLANS = [
    {
      id: "starter",
      name: "Starter",
      badge: "Para Profesionales Independientes",
      priceMonthly: 19,
      priceAnnual: 15,
      description: "Ideal para barberos independientes, cabinas privadas o salones que están comenzando.",
      features: [
        "1 Profesional / Sillón operativo",
        "Agenda inteligente anti-choque",
        "Página web propia de reservas (/tu-slug)",
        "Reservas online 24/7 ilimitadas",
        "Enlaces de confirmación por WhatsApp",
        "Directorio de clientes y notas de servicio",
        "Aislamiento multi-tenant 100% privado",
      ],
      cta: "Comenzar gratis con Starter",
      popular: false,
    },
    {
      id: "pro",
      name: "Pro Barbería",
      badge: "El Más Popular",
      priceMonthly: 49,
      priceAnnual: 39,
      description: "La solución integral para barberías y salones consolidados con equipo de trabajo.",
      features: [
        "Hasta 6 Profesionales / Sillones simultáneos",
        "Todo lo incluido en el plan Starter",
        "Módulo de Facturación interna y recibos",
        "4 Roles de acceso: Dueño, Admin, Recepción, Barbero",
        "Liquidación y comisiones por profesional automáticas",
        "Cierre y balance de caja diario",
        "Personalización de marca, logo y banner",
        "Soporte prioritario por WhatsApp",
      ],
      cta: "Comenzar prueba gratis de 14 días",
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      badge: "Cadenas y Franquicias",
      priceMonthly: 99,
      priceAnnual: 79,
      description: "Para cadenas de barberías con múltiples sucursales que exigen máxima escala y control.",
      features: [
        "Profesionales y sillones ilimitados",
        "Gestión unificada de múltiples sucursales",
        "Todo lo incluido en el plan Pro",
        "Migración asistida de datos de tu sistema anterior",
        "Roles y permisos organizacionales avanzados",
        "API para integraciones de software a medida",
        "Capacitación 1 a 1 para todo tu equipo",
        "Gerente de cuenta dedicado 24/7",
      ],
      cta: "Contactar a un Asesor",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 sm:py-32 relative border-t border-[var(--color-border)]">
      <Container size="wide">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-brass)] font-semibold uppercase tracking-wider mb-4">
              Planes Transparentes
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--color-paper)]">
              Sin comisiones por cita.{" "}
              <span className="text-[var(--color-brass)]">Solo pagas tu software.</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[var(--color-muted)]">
              A diferencia de otras plataformas que te cobran un porcentaje de cada corte, en Kortek todo lo que facturas es 100% tuyo.
            </p>

            {/* Toggle Mensual / Anual */}
            <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-1.5 shadow-md">
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  !annual
                    ? "bg-[var(--color-surface-raised)] text-[var(--color-paper)] shadow-sm"
                    : "text-[var(--color-muted)] hover:text-[var(--color-paper)]"
                }`}
              >
                Facturación Mensual
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
                  annual
                    ? "bg-[var(--color-brass)] text-white shadow-md shadow-[rgba(225,29,46,0.3)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-paper)]"
                }`}
              >
                <span>Facturación Anual</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                  Ahorra 20%
                </span>
              </button>
            </div>
          </div>
        </Reveal>

        {/* 3 Planes de Precios */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((plan, idx) => {
            const price = annual ? plan.priceAnnual : plan.priceMonthly;
            return (
              <Reveal key={plan.id} delay={idx * 100} className="h-full">
                <div
                  className={`relative flex flex-col justify-between rounded-3xl p-8 transition-all duration-300 h-full ${
                    plan.popular
                      ? "border-2 border-[var(--color-brass)] bg-[var(--color-surface-raised)] shadow-[0_0_40px_-10px_rgba(225,29,46,0.3)] lg:-translate-y-2"
                      : "border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] shadow-[var(--shadow-card)]"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-brass)] px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md">
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-paper)]">
                        {plan.name}
                      </h3>
                      {!plan.popular && (
                        <span className="text-[11px] text-[var(--color-muted)] font-mono">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-[var(--color-muted)] leading-relaxed">
                      {plan.description}
                    </p>

                    <div className="mt-6 flex items-baseline gap-1">
                      <span
                        key={price}
                        className="text-4xl font-extrabold text-[var(--color-paper)] font-[family-name:var(--font-display)] animate-fade-in inline-block"
                      >
                        ${price}
                      </span>
                      <span className="text-xs text-[var(--color-muted)]">
                        USD / mes {annual ? "(facturado anual)" : ""}
                      </span>
                    </div>

                    {/* Checklist de características */}
                    <ul className="mt-8 space-y-3.5 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-paper)]">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5">
                          <svg
                            className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-10 pt-4 border-t border-[var(--color-border)]/60">
                    <Link href="/register" className="w-full">
                      <Button
                        variant={plan.popular ? "primary" : "secondary"}
                        className="w-full py-3 text-xs uppercase tracking-wider font-semibold"
                      >
                        {plan.cta} →
                      </Button>
                    </Link>
                    <p className="mt-2 text-center text-[10px] text-[var(--color-faint)]">
                      14 días de prueba gratis · Sin tarjeta
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Garantía y Confianza */}
        <Reveal delay={300}>
          <div className="mt-16 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 sm:p-8 backdrop-blur text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--color-paper)]">
              <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Garantía de Satisfacción 100%</span>
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)] leading-relaxed">
              Si durante tus primeros 14 días sientes que Kortek Booking no agiliza radicalmente la operación de tu barbería, puedes cancelar tu cuenta con un solo clic. Cero preguntas, cero penalidades.
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
