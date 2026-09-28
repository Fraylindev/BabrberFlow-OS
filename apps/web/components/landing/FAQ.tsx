"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BRAND } from "@/lib/brand";

const FAQS = [
  {
    q: "¿Mis clientes necesitan descargar alguna app o crearse una cuenta para reservar?",
    a: "No. El cliente simplemente abre el enlace de tu barbería (ej. kortek.app/tu-negocio) desde Instagram, Google Maps o WhatsApp. Selecciona el servicio, el profesional y el horario deseado en menos de 30 segundos como invitado. Cero barreras de entrada.",
  },
  {
    q: "¿Cómo garantiza Kortek que mis clientes e ingresos no se mezclen con otras barberías?",
    a: "Kortek Booking está construido sobre una arquitectura multi-tenant estricta. Cada organización cuenta con aislamiento lógico y seguridad a nivel de base de datos. Ninguna otra barbería o usuario externo puede consultar o ver la información de tus clientes, facturación ni notas privadas.",
  },
  {
    q: "¿Puedo configurar horarios, turnos y comisiones diferentes para cada barbero?",
    a: "Totalmente. Cada profesional de tu equipo puede tener sus propios días laborales, horarios de entrada/salida, descansos programados y porcentaje de comisión por servicio. La liquidación de propinas y comisiones se calcula en tiempo real conforme completan citas.",
  },
  {
    q: "¿Kortek cobra algún porcentaje o comisión sobre los cortes que realizo?",
    a: "No. A diferencia de otros directorios que cobran un 15% o 20% de cada cliente que reserva, en Kortek solo pagas una suscripción fija mensual o anual según tu plan. Todo el dinero que generas en tu salón es 100% tuyo.",
  },
  {
    q: "¿Funciona en teléfonos móviles y tablets sin instalaciones complejas?",
    a: "Sí. Kortek OS es 100% web y responsive. Funciona a la perfección desde el navegador de cualquier iPhone, Android, iPad o computadora de mostrador. Puedes añadir un acceso directo a la pantalla de inicio de tu teléfono en 2 segundos.",
  },
  {
    q: "¿Qué sucede al finalizar los 14 días de prueba gratuita?",
    a: "Durante los 14 días tienes acceso completo a todas las funciones sin ingresar tarjeta de crédito. Al finalizar el periodo, puedes elegir el plan que mejor se adapte a tu barbería para continuar. Si decides no continuar, no se te cobrará absolutamente nada.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 sm:py-32 relative border-t border-[var(--color-border)]">
      <Container size="wide" className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <Reveal className="lg:col-span-5">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-brass)] font-semibold uppercase tracking-wider">
              Preguntas Frecuentes
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-paper)] leading-tight">
              Respuestas claras antes de empezar con tu salón
            </h2>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">
              ¿Tienes alguna consulta adicional antes de registrarte? Escríbenos directamente a través de nuestro canal de WhatsApp para atenderte de inmediato.
            </p>
            <div className="pt-2">
              <a
                href={BRAND.contact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-brass)] hover:underline"
              >
                <span>Consultar con un especialista en WhatsApp</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal delay={80} className="lg:col-span-7">
          <div className="flex flex-col gap-3.5">
            {FAQS.map((item, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={item.q}
                  className={`rounded-2xl border transition-all duration-200 ${
                    isOpen
                      ? "border-[var(--color-brass)]/40 bg-[var(--color-surface-raised)] shadow-[0_4px_24px_-8px_rgba(225,29,46,0.15)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${i}`}
                    className="flex w-full cursor-pointer items-center justify-between p-5 text-left text-sm font-semibold text-[var(--color-paper)] group"
                  >
                    <span className="pr-4 leading-snug group-hover:text-white transition-colors">
                      {item.q}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-transform duration-200 ${
                        isOpen
                          ? "rotate-180 border-[var(--color-brass)] bg-[var(--color-brass)] text-white shadow-sm"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]"
                      }`}
                    >
                      <svg
                        className="h-3.5 w-3.5 stroke-current"
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>
                  <div
                    id={`faq-answer-${i}`}
                    className={`grid overflow-hidden transition-[grid-template-rows] duration-250 ease-[var(--ease-out)] ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="min-h-0">
                      <p className="px-5 pb-5 pt-0 text-xs sm:text-sm leading-relaxed text-[var(--color-muted)]">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
