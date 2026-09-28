import React from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { BRAND } from "@/lib/brand";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-ink)] text-[var(--color-paper)] lg:grid lg:grid-cols-12">
      {/* Columna Izquierda: Formulario de Autenticación */}
      <div className="flex min-h-screen flex-col justify-between px-6 py-8 sm:px-12 lg:col-span-7 xl:col-span-6 lg:px-16 lg:py-12">
        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <Link href="/" className="transition-opacity hover:opacity-90">
            <Brand compact />
          </Link>
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
        </div>

        {/* Bloque Central de Login/Registro */}
        <div className="my-auto mx-auto w-full max-w-md py-10">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brass)]/30 bg-[var(--color-brass)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-brass)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brass)] animate-pulse" />
              {eyebrow}
            </span>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--color-paper)] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-muted)]">
              {description}
            </p>
          </div>

          {/* Contenedor del componente de Clerk con bordes nítidos y sin elevaciones sucias */}
          <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-1 sm:p-2 backdrop-blur-xl shadow-[var(--shadow-card)]">
            <div className="p-4 sm:p-6">{children}</div>
          </div>

          {/* Garantías de seguridad bajo el formulario */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-[11px] text-[var(--color-faint)]">
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Conexión cifrada TLS 1.3</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-[var(--color-brass)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span>Aislamiento multi-tenant estricto</span>
            </div>
          </div>
        </div>

        {/* Footer Legal del formulario */}
        <div className="flex items-center justify-between text-xs text-[var(--color-faint)]">
          <span>{BRAND.name} OS</span>
          <div className="flex items-center gap-4">
            <Link href="/terminos" className="hover:text-[var(--color-paper)] transition-colors">Términos</Link>
            <Link href="/politica-de-privacidad" className="hover:text-[var(--color-paper)] transition-colors">Privacidad</Link>
          </div>
        </div>
      </div>

      {/* Columna Derecha: Panel Visual SaaS Showcase (Desktop) */}
      <div className="relative hidden lg:col-span-5 xl:col-span-6 lg:flex flex-col justify-between overflow-hidden border-l border-[var(--color-border)] bg-[#0a0d12] p-12 xl:p-16">
        {/* Glows y fondos atmosféricos */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-brass)]/12 blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]"
        />
        <div aria-hidden="true" className="bg-grid-subtle absolute inset-0 opacity-40" />

        {/* Status de plataforma superior */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)]/80 px-3 py-1 text-xs text-[var(--color-muted)] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Infraestructura Operativa 99.98%</span>
          </div>
          <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-faint)]">
            v2.4 Production
          </span>
        </div>

        {/* Mockup Interactivo Flotante de Barbería */}
        <div className="relative z-10 my-auto py-8">
          <div className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)]/90 p-6 backdrop-blur-2xl shadow-[var(--shadow-raised)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brass)] text-white font-bold text-sm shadow-md">
                  KB
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[var(--color-paper)]">Mendoza Barber Studio</h3>
                  <p className="text-xs text-[var(--color-muted)]">Santo Domingo · 4 Barberos en turno</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                ● En vivo
              </span>
            </div>

            {/* Simulación de Cita Actual */}
            <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)]/70 p-4">
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-brass)] font-semibold">
                  15:00 - 15:45 · Sillón 01
                </span>
                <span className="text-[11px] font-medium text-emerald-400">
                  Confirmada WhatsApp
                </span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-[var(--color-paper)]">
                Corte Ejecutivo & Perfilado de Barba
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-muted)]">
                <span>Cliente: Gabriel Méndez</span>
                <span className="font-semibold text-[var(--color-paper)]">$1,200 DOP</span>
              </div>
            </div>

            {/* Métricas Rápidas del Día */}
            <div className="mt-4 grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-ink)]/50 p-2.5 text-center">
                <span className="block text-[11px] text-[var(--color-muted)]">Citas hoy</span>
                <span className="font-semibold text-sm text-[var(--color-paper)]">18 / 18</span>
              </div>
              <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-ink)]/50 p-2.5 text-center">
                <span className="block text-[11px] text-[var(--color-muted)]">Ocupación</span>
                <span className="font-semibold text-sm text-emerald-400">100%</span>
              </div>
              <div className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-ink)]/50 p-2.5 text-center">
                <span className="block text-[11px] text-[var(--color-muted)]">Facturado</span>
                <span className="font-semibold text-sm text-[var(--color-paper)]">$24,800</span>
              </div>
            </div>
          </div>

          {/* Testimonio destacado */}
          <div className="mt-6 rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/50 p-5 backdrop-blur-md">
            <p className="text-xs leading-relaxed text-[var(--color-paper)]/85 italic">
              &ldquo;Kortek nos quitó el estrés de responder 50 mensajes de WhatsApp los sábados. El cliente abre el link, ve quién está libre y reserva. Cero margen de error.&rdquo;
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full bg-[var(--color-brass)]/20 border border-[var(--color-brass)]/40 flex items-center justify-center text-[10px] font-bold text-[var(--color-brass)]">
                CM
              </div>
              <span className="text-xs font-semibold text-[var(--color-paper)]">Carlos Mendoza</span>
              <span className="text-xs text-[var(--color-muted)]">— Fundador Mendoza Studio</span>
            </div>
          </div>
        </div>

        {/* Pilares de Producto */}
        <div className="relative z-10 flex items-center justify-between border-t border-[var(--color-border)]/70 pt-6 text-xs text-[var(--color-muted)]">
          <span>✓ Multi-roles independientes</span>
          <span>✓ Liquidación automática</span>
          <span>✓ 100% Web sin descargas</span>
        </div>
      </div>
    </div>
  );
}
