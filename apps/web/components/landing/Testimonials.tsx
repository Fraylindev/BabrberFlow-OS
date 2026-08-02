"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { TESTIMONIAL_PHOTOS } from "@/lib/landing-photos";
import { SectionHeading } from "./Section";

// Testimonios de ejemplo (mock) — nombres y negocios ficticios para el
// lanzamiento inicial. Las fotos son retratos de archivo (Unsplash),
// sin relación con la persona real detrás de cada nombre — se muestran
// como marcador visual de "esto es una persona", no como prueba de que
// esa persona específica existió. Reemplazar por clientes reales en
// cuanto existan.
const TESTIMONIALS = [
  {
    quote:
      "Dejamos de perder citas por WhatsApp desordenado. Ahora todo el equipo ve la misma agenda, y mis clientes reservan solos desde el teléfono.",
    name: "M. Reyes",
    role: "Dueña, Studio Reyes",
    photo: TESTIMONIAL_PHOTOS.reyes,
  },
  {
    quote: "Yo solo abro el panel y veo el día armado. Nada de llamadas, nada de confusión. Todo en un solo lugar.",
    name: "J. Almonte",
    role: "Barbero independiente",
    photo: TESTIMONIAL_PHOTOS.almonte,
  },
  {
    quote:
      "Poder separar lo que ve cada barbero de lo que veo yo como dueño cambió cómo manejamos el negocio.",
    name: "C. Ventura",
    role: "Dueño, Ventura Barbershop",
    photo: TESTIMONIAL_PHOTOS.ventura,
  },
];

const AUTOPLAY_MS = 6000;

export function Testimonials() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = TESTIMONIALS.length;

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    timer.current = setInterval(() => {
      setActive((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, count]);

  return (
    <section className="py-20 sm:py-28">
      <Container size="wide">
        <Reveal>
          <SectionHeading eyebrow="Quién ya lo usa" title="Barberías que ya organizaron su agenda" />
        </Reveal>

        <Reveal
          delay={100}
          className="relative mx-auto mt-14 max-w-3xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div
            role="region"
            aria-live="polite"
            aria-label="Testimonios de clientes"
            className="relative overflow-hidden rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)]"
          >
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                aria-hidden={i !== active}
                className={`grid grid-cols-1 gap-8 p-8 transition-opacity duration-[var(--duration-slow)] ease-[var(--ease-out)] sm:grid-cols-[auto_1fr] sm:items-center sm:p-12 ${
                  i === active ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
                }`}
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[var(--color-brass)]">
                  <Image
                    src={t.photo.src}
                    alt={t.photo.alt}
                    fill
                    sizes="80px"
                    className="cinematic-grade object-cover"
                  />
                </div>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-xl leading-snug text-[var(--color-paper)] sm:text-2xl">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="mt-4 text-sm text-[var(--color-muted)]">
                    <span className="text-[var(--color-paper)]">{t.name}</span> · {t.role}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </Reveal>

        <Reveal delay={160} className="mt-6 flex items-center justify-center gap-2">
            {TESTIMONIALS.map((t, i) => (
              <button
                key={t.name}
                onClick={() => setActive(i)}
                aria-label={`Ver testimonio de ${t.name}`}
                aria-current={i === active}
                className={`h-1.5 rounded-full transition-all duration-[var(--duration-base)] ${
                  i === active ? "w-8 bg-[var(--color-brass)]" : "w-1.5 bg-[var(--color-border-strong)]"
                }`}
              />
            ))}
        </Reveal>
      </Container>
    </section>
  );
}
