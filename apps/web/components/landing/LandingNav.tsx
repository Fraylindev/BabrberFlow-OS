"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

const LINKS = [
  { href: "#features", label: "Características" },
  { href: "#demo", label: "Demostración" },
  { href: "#beneficios", label: "Beneficios" },
  { href: "#pricing", label: "Precios" },
  { href: "#testimonios", label: "Testimonios" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sectionIds = ["features", "demo", "beneficios", "pricing", "testimonios", "faq"];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[var(--color-border-strong)] bg-[var(--color-ink)]/85 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <Container size="wide" className="flex items-center justify-between py-3.5 sm:py-4">
        {/* Brand & Version Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-md transition-opacity hover:opacity-95">
            <Brand compact />
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-2.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Kortek OS 2.4</span>
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegación principal">
          {LINKS.map((l) => {
            const isActive = activeSection === l.href.replace("#", "");
            return (
              <a
                key={l.href}
                href={l.href}
                className={`relative text-xs font-medium uppercase tracking-wider transition-colors duration-150 py-1 ${
                  isActive
                    ? "text-[var(--color-paper)] font-semibold"
                    : "text-[var(--color-muted)] hover:text-[var(--color-paper)]"
                }`}
              >
                {l.label}
                {isActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-[var(--color-brass)] animate-fade-in" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/login"
            className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] px-3 py-2 transition-colors hover:text-[var(--color-paper)]"
          >
            Iniciar sesión
          </Link>
          <Link href="/register">
            <Button className="px-4 py-2 text-xs font-semibold uppercase tracking-wider shadow-sm hover:shadow-[0_0_20px_-4px_rgba(225,29,46,0.6)]">
              Registra tu barbería
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-paper)] transition-colors hover:bg-[var(--color-surface)] active:scale-95 lg:hidden focus-visible:outline-2 focus-visible:outline-[var(--color-brass)] cursor-pointer"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
        >
          <svg
            className="h-5 w-5 stroke-[var(--color-paper)]"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line
              x1="4"
              y1="6"
              x2="20"
              y2="6"
              className={`transition-all duration-300 ease-[var(--ease-out)] origin-center ${
                open ? "translate-y-[6px] rotate-45" : ""
              }`}
            />
            <line
              x1="4"
              y1="12"
              x2="20"
              y2="12"
              className={`transition-opacity duration-200 ease-[var(--ease-out)] ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <line
              x1="4"
              y1="18"
              x2="20"
              y2="18"
              className={`transition-all duration-300 ease-[var(--ease-out)] origin-center ${
                open ? "-translate-y-[6px] -rotate-45" : ""
              }`}
            />
          </svg>
        </button>
      </Container>

      {/* Mobile Drawer Menu */}
      <div
        id="landing-mobile-menu"
        className={`grid lg:hidden transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out)] ${
          open
            ? "grid-rows-[1fr] opacity-100 border-t border-[var(--color-border)]"
            : "grid-rows-[0fr] opacity-0 border-t border-transparent pointer-events-none"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3 bg-[var(--color-ink)]/95 px-6 py-6 backdrop-blur-xl">
            {LINKS.map((l) => {
              const isActive = activeSection === l.href.replace("#", "");
              return (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`text-sm font-medium transition-colors py-1.5 flex items-center justify-between ${
                    isActive
                      ? "text-[var(--color-paper)] font-semibold"
                      : "text-[var(--color-muted)] hover:text-[var(--color-paper)]"
                  }`}
                >
                  <span>{l.label}</span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brass)]" />}
                </a>
              );
            })}
            <div className="mt-3 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg py-2.5 text-center text-sm font-medium text-[var(--color-paper)] transition-colors hover:bg-[var(--color-surface)] border border-[var(--color-border)]"
              >
                Iniciar sesión
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                <Button className="w-full py-2.5 text-sm">Registra tu barbería</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
