"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { LANDING_PHOTOS } from "@/lib/landing-photos";

export function Hero() {
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  return (
    <section className="relative overflow-hidden pt-12 pb-24 sm:pt-20 sm:pb-32">
      {/* Fondo cinematográfico con gradación y máscara */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Image
          src={LANDING_PHOTOS.heroInterior.src}
          alt={LANDING_PHOTOS.heroInterior.alt}
          fill
          priority
          sizes="100vw"
          className="cinematic-grade object-cover opacity-25 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-ink)]/70 via-[var(--color-ink)]/90 to-[var(--color-ink)]" />
        <div className="bg-grid-subtle absolute inset-0 opacity-30" />
        <div className="film-grain absolute inset-0" />

        {/* Resplandores ambientales superiores */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 -top-24 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(225,29,46,0.18)_0%,rgba(0,0,0,0)_70%)] blur-[90px]"
        />
      </div>

      <Container size="wide" className="relative">
        {/* Cabecera del Hero */}
        <div className="mx-auto max-w-4xl text-center">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brass)]/40 bg-[var(--color-surface)]/80 px-4 py-1.5 text-xs text-[var(--color-paper)] backdrop-blur-md shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium">Kortek OS v2.4</span>
            <span className="text-[var(--color-faint)]">·</span>
            <span className="text-[var(--color-muted)]">El estándar para barberías de alta gama</span>
          </div>

          {/* Headline */}
          <h1 className="mt-8 font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight text-[var(--color-paper)] sm:text-6xl lg:text-7xl leading-[1.04]">
            El sistema operativo para barberías que{" "}
            <span className="bg-gradient-to-r from-[var(--color-brass)] via-[#ff4d5e] to-[var(--color-brass)] bg-clip-text text-transparent">
              facturan en serio.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-base text-[var(--color-muted)] sm:text-lg lg:text-xl leading-relaxed">
            Elimina choques de horario, recibe reservas 24/7 sin que tus clientes bajen apps pesadas, coordina a tu equipo por roles y factura directo desde cada cita. Tu marca al frente, siempre.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto px-8 py-3.5 text-sm uppercase tracking-wider font-semibold shadow-lg shadow-[rgba(225,29,46,0.3)] hover:shadow-[0_0_30px_-4px_rgba(225,29,46,0.7)]">
                Comenzar prueba gratis de 14 días →
              </Button>
            </Link>
            <a href="#features" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto px-6 py-3.5 text-sm uppercase tracking-wider font-medium">
                Explorar características ↓
              </Button>
            </a>
          </div>

          {/* Micro Trust Guarantee */}
          <p className="mt-4 text-xs text-[var(--color-faint)]">
            Sin tarjeta de crédito · Cero comisiones por cita · Activación en 3 minutos
          </p>
        </div>

        {/* Mockup Interactivo de la Plataforma en Vivo */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          {/* Luz de acento perimetral */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-b from-[var(--color-brass)]/30 via-transparent to-transparent opacity-60 blur-md"
          />

          <div className="relative rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)]/95 shadow-2xl backdrop-blur-xl overflow-hidden">
            {/* Topbar de la ventana / App Shell */}
            <div className="flex flex-wrap items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-ink)]/70 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <div className="h-4 w-px bg-[var(--color-border)] mx-1 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--color-paper)]">
                    Mendoza Barber Studio
                  </span>
                  <span className="rounded-full bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    ● En vivo
                  </span>
                </div>
              </div>

              {/* Controles de vista interactivos */}
              <div className="mt-2 sm:mt-0 flex items-center gap-2">
                <span className="text-xs text-[var(--color-muted)] mr-1">
                  Hoy · 26 Sep 2026
                </span>
                <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("day")}
                    className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      viewMode === "day"
                        ? "bg-[var(--color-brass)] text-white shadow-sm"
                        : "text-[var(--color-muted)] hover:text-[var(--color-paper)]"
                    }`}
                  >
                    Vista Día
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("week")}
                    className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      viewMode === "week"
                        ? "bg-[var(--color-brass)] text-white shadow-sm"
                        : "text-[var(--color-muted)] hover:text-[var(--color-paper)]"
                    }`}
                  >
                    Vista Semana
                  </button>
                </div>
              </div>
            </div>

            {/* Contenido dinámico del Scheduler simulado */}
            <div className="p-4 sm:p-6 lg:p-8">
              {viewMode === "day" ? (
                <div key="hero-day-view" className="animate-fade-in">
                  {/* Columnas por barbero con header y citas unificados */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4">
                    {/* Columna Carlos */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border)] text-xs font-semibold text-[var(--color-muted)]">
                        <div className="h-6 w-6 rounded-full bg-[var(--color-brass)]/20 border border-[var(--color-brass)]/40 flex items-center justify-center text-[10px] font-bold text-[var(--color-brass)]">
                          CM
                        </div>
                        <span className="text-[var(--color-paper)]">Carlos Mendoza (Sillón 1)</span>
                      </div>

                      <div className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]/90 p-3.5 shadow-sm hover:border-[var(--color-brass)]/60 transition-colors">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-semibold text-[var(--color-brass)]">10:00 - 10:45</span>
                          <span className="rounded-full bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-400 font-medium">
                            Confirmada
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-[var(--color-paper)]">
                          Fade Clásico + Barba Esculpida
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-muted)]">
                          <span>Gabriel Méndez</span>
                          <span className="font-semibold text-[var(--color-paper)]">$1,200 DOP</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]/50 p-3.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-[var(--color-muted)]">11:15 - 12:00</span>
                          <span className="text-[10px] text-yellow-400 font-medium">En proceso</span>
                        </div>
                        <p className="mt-2 text-xs font-medium text-[var(--color-paper)]">
                          Corte Ejecutivo a Tijera
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-muted)]">
                          <span>Rafael Castillo</span>
                          <span className="font-semibold text-[var(--color-paper)]">$900 DOP</span>
                        </div>
                      </div>
                    </div>

                    {/* Columna Marcos */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border)] text-xs font-semibold text-[var(--color-muted)]">
                        <div className="h-6 w-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-[10px] font-bold text-blue-400">
                          MD
                        </div>
                        <span className="text-[var(--color-paper)]">Marcos Díaz (Sillón 2)</span>
                      </div>

                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]/50 p-3.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-blue-400">10:30 - 11:15</span>
                          <span className="text-[10px] text-emerald-400 font-medium">Completada</span>
                        </div>
                        <p className="mt-2 text-xs font-medium text-[var(--color-paper)]">
                          Skin Fade & Diseño Tribal
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-muted)]">
                          <span>Andrés Santana</span>
                          <span className="font-semibold text-[var(--color-paper)]">$1,100 DOP</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]/90 p-3.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-semibold text-[var(--color-brass)]">12:30 - 13:15</span>
                          <span className="text-[10px] text-emerald-400 font-medium">Confirmada</span>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-[var(--color-paper)]">
                          Corte Niño + Lavado
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-muted)]">
                          <span>Mateo Morales</span>
                          <span className="font-semibold text-[var(--color-paper)]">$750 DOP</span>
                        </div>
                      </div>
                    </div>

                    {/* Columna Lucas */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border)] text-xs font-semibold text-[var(--color-muted)]">
                        <div className="h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                          LR
                        </div>
                        <span className="text-[var(--color-paper)]">Lucas Ramos (Sillón 3)</span>
                      </div>

                      <div className="rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)]/90 p-3.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-semibold text-[var(--color-brass)]">11:00 - 12:00</span>
                          <span className="text-[10px] text-emerald-400 font-medium">Confirmada</span>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-[var(--color-paper)]">
                          Tratamiento Capilar & Barba VIP
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-muted)]">
                          <span>Diego Valerio</span>
                          <span className="font-semibold text-[var(--color-paper)]">$1,800 DOP</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-dashed border-[var(--color-border)] p-3.5 text-center text-xs text-[var(--color-faint)]">
                        + Espacio libre 12:30 disponible para reserva web
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Vista Semana */
                <div key="hero-week-view" className="animate-fade-in overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
                  <div className="min-w-[540px] space-y-3">
                    <div className="grid grid-cols-6 gap-2 text-center text-xs font-semibold text-[var(--color-muted)] pb-3 border-b border-[var(--color-border)]">
                      <div>Lunes (14)</div>
                      <div>Martes (16)</div>
                      <div>Miércoles (18)</div>
                      <div>Jueves (19)</div>
                      <div className="text-[var(--color-brass)]">Viernes (24) ★</div>
                      <div className="text-emerald-400">Sábado (28) ★</div>
                    </div>
                    <div className="grid grid-cols-6 gap-2 text-xs">
                      <div className="h-24 rounded-lg bg-[var(--color-surface-raised)] p-2 flex flex-col justify-between">
                        <span className="text-[10px] text-[var(--color-muted)]">88% ocupado</span>
                        <span className="font-semibold text-[var(--color-paper)]">$16,200</span>
                      </div>
                      <div className="h-24 rounded-lg bg-[var(--color-surface-raised)] p-2 flex flex-col justify-between">
                        <span className="text-[10px] text-[var(--color-muted)]">92% ocupado</span>
                        <span className="font-semibold text-[var(--color-paper)]">$18,400</span>
                      </div>
                      <div className="h-24 rounded-lg bg-[var(--color-surface-raised)] p-2 flex flex-col justify-between">
                        <span className="text-[10px] text-[var(--color-muted)]">95% ocupado</span>
                        <span className="font-semibold text-[var(--color-paper)]">$21,000</span>
                      </div>
                      <div className="h-24 rounded-lg bg-[var(--color-surface-raised)] p-2 flex flex-col justify-between">
                        <span className="text-[10px] text-[var(--color-muted)]">98% ocupado</span>
                        <span className="font-semibold text-[var(--color-paper)]">$23,500</span>
                      </div>
                      <div className="h-24 rounded-lg border border-[var(--color-brass)]/40 bg-[var(--color-brass)]/10 p-2 flex flex-col justify-between">
                        <span className="text-[10px] text-[var(--color-brass)] font-semibold">100% LLENO</span>
                        <span className="font-bold text-[var(--color-paper)]">$32,800</span>
                      </div>
                      <div className="h-24 rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-2 flex flex-col justify-between">
                        <span className="text-[10px] text-emerald-400 font-semibold">100% LLENO</span>
                        <span className="font-bold text-[var(--color-paper)]">$38,400</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Barra inferior de métricas en vivo */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] pt-4 text-xs">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[var(--color-muted)]">Ocupación estimada: </span>
                    <span className="font-semibold text-emerald-400">96.4%</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted)]">Ingreso proyectado hoy: </span>
                    <span className="font-semibold text-[var(--color-paper)]">$28,450 DOP</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[var(--color-muted)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Sincronización multi-dispositivo activa</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Prueba Social y Métricas Clave */}
        <div className="mt-16 border-t border-[var(--color-border)] pt-10">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
            <div>
              <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-paper)] sm:text-4xl">
                +120
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)] uppercase tracking-wider">
                Barberías & salones activos
              </p>
            </div>
            <div>
              <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-paper)] sm:text-4xl">
                45,000+
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)] uppercase tracking-wider">
                Citas gestionadas sin fricción
              </p>
            </div>
            <div>
              <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-emerald-400 sm:text-4xl">
                0%
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)] uppercase tracking-wider">
                Comisión por tus reservas
              </p>
            </div>
            <div>
              <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-paper)] sm:text-4xl">
                99.98%
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)] uppercase tracking-wider">
                Disponibilidad garantizada
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
