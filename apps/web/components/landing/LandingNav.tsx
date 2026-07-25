"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";

const LINKS = [
  { href: "#beneficios", label: "Beneficios" },
  { href: "#modulos", label: "Módulos" },
  { href: "#planes", label: "Planes" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-ink)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/">
          <Brand compact />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-paper)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-paper)]"
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
          aria-label="Abrir menú"
          aria-expanded={open}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-4 border-t border-[var(--color-border)] px-4 py-4 md:hidden">
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
      )}
    </header>
  );
}
