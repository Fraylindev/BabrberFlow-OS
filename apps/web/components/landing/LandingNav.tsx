"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

const LINKS = [
  { href: "#beneficios", label: "Beneficios" },
  { href: "#modulos", label: "Módulos" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-[var(--color-ink)]/90 backdrop-blur transition-[border-color,box-shadow] duration-[var(--duration-base)] ${
        scrolled
          ? "border-[var(--color-border-strong)] shadow-[var(--shadow-card)]"
          : "border-transparent"
      }`}
    >
      <Container size="wide" className="flex items-center justify-between py-4">
        <Link href="/" className="rounded-sm">
          <Brand compact />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación principal">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[var(--color-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-paper)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-paper)]"
          >
            Iniciar sesión
          </Link>
          <Link href="/register">
            <Button className="px-4 py-2 text-sm">Registra tu barbería</Button>
          </Link>
        </div>

        <button
          className="text-[var(--color-paper)] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
        >
          {open ? "✕" : "☰"}
        </button>
      </Container>

      <div
        id="landing-mobile-menu"
        className={`grid overflow-hidden transition-[grid-template-rows] duration-[var(--duration-base)] ease-[var(--ease-out)] md:hidden ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <div className="flex flex-col gap-4 border-t border-[var(--color-border)] px-4 py-4">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm text-[var(--color-muted)]"
              >
                {l.label}
              </a>
            ))}
            <Link href="/login" className="text-sm text-[var(--color-muted)]">
              Iniciar sesión
            </Link>
            <Link href="/register">
              <Button className="w-full">Registra tu barbería</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
