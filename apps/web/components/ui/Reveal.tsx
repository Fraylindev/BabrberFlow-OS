"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

type Direction = "up" | "none";

/**
 * Revela su contenido con un fundido + leve desplazamiento cuando entra
 * en el viewport. Sin librería de animación — un IntersectionObserver y
 * dos clases de Tailwind son suficientes para lo que este producto
 * necesita, y evita una dependencia nueva sin caso de uso más amplio
 * todavía (mismo criterio YAGNI que el resto del proyecto).
 *
 * `prefers-reduced-motion` ya fuerza duraciones a ~0 globalmente en
 * globals.css, así que este componente no necesita lógica adicional
 * para respetarlo.
 */
export function Reveal({
  children,
  direction = "up",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const hiddenTransform = direction === "up" ? "translate-y-6" : "";

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={`transition-[opacity,transform] duration-[var(--duration-slow)] ease-[var(--ease-out)] ${
        visible ? "opacity-100 translate-y-0" : `opacity-0 ${hiddenTransform}`
      } ${className}`}
    >
      {children}
    </div>
  );
}
