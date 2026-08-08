"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { BRAND } from "@/lib/brand";

const FAQS = [
  {
    q: "¿Necesito instalar algo?",
    a: `No. ${BRAND.name} corre en el navegador, tanto para ti como para tus clientes. Nada que descargar.`,
  },
  {
    q: "¿Mis clientes necesitan crear una cuenta para reservar?",
    a: "No es obligatorio, pueden reservar como invitados. Si quieren, pueden crear una cuenta para que su próxima reserva sea más rápida.",
  },
  {
    q: "¿Puedo tener varios profesionales con acceso al panel?",
    a: "Sí. Cada persona de tu equipo tiene su propio usuario y rol: dueño, administrador, recepción o profesional, cada uno ve solo lo que le corresponde.",
  },
  {
    q: "¿Puedo cambiar de plan más adelante?",
    a: "Sí, en cualquier momento. No hay contrato de permanencia.",
  },
  {
    q: "¿Mis datos se mezclan con los de otras barberías?",
    a: "No. Cada barbería tiene sus datos completamente aislados, es parte del diseño desde la base, no un ajuste extra.",
  },
];

export function FAQ() {
  // Acordeón controlado: solo un índice abierto a la vez. Se usa la
  // técnica grid-template-rows (0fr → 1fr) para animar la altura sin
  // medirla en JS — el mismo mecanismo que ya usa el menú móvil de
  // LandingNav, reutilizado en vez de reinventado.
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 sm:py-28">
      <Container size="wide" className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-brass)]">
            Preguntas frecuentes
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-paper)] sm:text-4xl">
            Todo lo que quieres saber antes de empezar
          </h2>
        </Reveal>

        <div className="flex flex-col gap-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 50}>
                <div
                  className={`rounded-sm border bg-[var(--color-surface)] transition-colors duration-[var(--duration-base)] ${
                    isOpen ? "border-[var(--color-brass)]/40" : "border-[var(--color-border)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left text-sm text-[var(--color-paper)]"
                  >
                    {item.q}
                    <span
                      aria-hidden
                      className={`ml-4 shrink-0 text-[var(--color-muted)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)] ${
                        isOpen ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>
                  <div
                    id={`faq-panel-${i}`}
                    className={`grid overflow-hidden transition-[grid-template-rows] duration-[var(--duration-base)] ease-[var(--ease-out)] ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="min-h-0">
                      <p className="px-5 pb-4 text-sm text-[var(--color-muted)]">{item.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
