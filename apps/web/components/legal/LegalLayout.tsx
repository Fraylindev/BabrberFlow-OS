import React from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Container } from "@/components/ui/Container";
import { BRAND } from "@/lib/brand";

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  activeDoc?: "terminos" | "privacidad" | "cookies";
  children: React.ReactNode;
}

export function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  activeDoc = "terminos",
  children,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--color-ink)] text-[var(--color-paper)]">
      {/* Top Navigation Bar dedicated to Legal Center */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-ink)]/90 backdrop-blur-md">
        <Container size="wide" className="flex items-center justify-between py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="transition-opacity hover:opacity-90">
              <Brand compact={false} />
            </Link>
            <div className="hidden sm:flex items-center gap-2 border-l border-[var(--color-border)] pl-4 text-xs text-[var(--color-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Centro de Confianza & Normativo</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-paper)]"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Volver al inicio
            </Link>
            <Link
              href="/register"
              className="hidden sm:inline-flex items-center justify-center rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--color-paper)] hover:border-[var(--color-brass)] hover:text-white transition-colors"
            >
              Crear cuenta
            </Link>
          </div>
        </Container>
      </header>

      <main className="py-12 sm:py-16">
        <Container size="wide" className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Sticky Sidebar Navigation */}
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-24 space-y-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Documentación Legal
                </p>
                <nav className="mt-3 flex flex-col gap-1.5">
                  <Link
                    href="/terminos"
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      activeDoc === "terminos"
                        ? "bg-[var(--color-surface-raised)] text-[var(--color-paper)] border border-[var(--color-border-strong)]"
                        : "text-[var(--color-muted)] hover:text-[var(--color-paper)] hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <span>Términos del Servicio</span>
                    {activeDoc === "terminos" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brass)]" />
                    )}
                  </Link>

                  <Link
                    href="/politica-de-privacidad"
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      activeDoc === "privacidad"
                        ? "bg-[var(--color-surface-raised)] text-[var(--color-paper)] border border-[var(--color-border-strong)]"
                        : "text-[var(--color-muted)] hover:text-[var(--color-paper)] hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <span>Política de Privacidad</span>
                    {activeDoc === "privacidad" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brass)]" />
                    )}
                  </Link>

                  <Link
                    href="/cookies"
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      activeDoc === "cookies"
                        ? "bg-[var(--color-surface-raised)] text-[var(--color-paper)] border border-[var(--color-border-strong)]"
                        : "text-[var(--color-muted)] hover:text-[var(--color-paper)] hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <span>Política de Cookies</span>
                    {activeDoc === "cookies" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brass)]" />
                    )}
                  </Link>
                </nav>
              </div>

              {/* Security Pill Card */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-paper)]">
                  <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Compromiso Kortek</span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
                  Todos los datos de clientes, citas y facturación se encuentran lógicamente aislados por negocio mediante arquitectura multi-tenant estricta.
                </p>
              </div>
            </div>
          </aside>

          {/* Main Article Content */}
          <section className="lg:col-span-9 max-w-3xl">
            {/* Header */}
            <header className="border-b border-[var(--color-border)] pb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)] mb-4">
                <span>Marco Regulatorio Oficial</span>
                <span>·</span>
                <span>Versión 2.4</span>
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold sm:text-4xl text-[var(--color-paper)] leading-tight">
                {title}
              </h1>
              <p className="mt-4 text-base text-[var(--color-muted)] leading-relaxed">
                {subtitle}
              </p>
              <div className="mt-5 flex items-center gap-3 text-xs text-[var(--color-faint)]">
                <span>Última revisión: {lastUpdated}</span>
                <span>•</span>
                <span>Jurisdicción: República Dominicana</span>
              </div>
            </header>

            {/* Legal Clauses */}
            <article className="mt-10 space-y-12 text-sm leading-relaxed text-[var(--color-paper)]/90 sm:text-base">
              {children}
            </article>

            {/* Footer Signature */}
            <div className="mt-16 border-t border-[var(--color-border)] pt-8">
              <p className="text-xs text-[var(--color-muted)]">
                Para consultas de privacidad o cumplimiento legal, escriba a los canales oficiales de {BRAND.company} o comuníquese a través de nuestro soporte técnico autorizado.
              </p>
            </div>
          </section>
        </Container>
      </main>

      {/* Standalone Legal Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-8 mt-16 text-xs text-[var(--color-muted)]">
        <Container size="wide" className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>{BRAND.footer.copyright()}</p>
          <div className="flex items-center gap-4">
            <Link href="/terminos" className="hover:text-[var(--color-paper)] transition-colors">Términos</Link>
            <span>·</span>
            <Link href="/politica-de-privacidad" className="hover:text-[var(--color-paper)] transition-colors">Privacidad</Link>
            <span>·</span>
            <Link href="/cookies" className="hover:text-[var(--color-paper)] transition-colors">Cookies</Link>
          </div>
        </Container>
      </footer>
    </div>
  );
}
