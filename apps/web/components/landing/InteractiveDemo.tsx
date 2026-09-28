"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

type RoleTab = "cliente" | "barbero" | "recepcion" | "dueno";

interface TabData {
  title: string;
  badge: string;
  headline: string;
  description: string;
  preview: React.ReactNode;
}

export function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState<RoleTab>("cliente");

  const TABS: Record<RoleTab, TabData> = {
    cliente: {
      title: "Para el Cliente",
      badge: "Cero fricción · 100% Web",
      headline: "Tu cliente reserva en 20 segundos sin descargar ninguna app",
      description:
        "Tus clientes abren tu enlace desde Instagram, Google Maps o WhatsApp. Seleccionan el corte, eligen a su barbero de confianza, el día y la hora. Reciben su confirmación instantánea sin trámites ni contraseñas forzadas.",
      preview: (
        <div className="mx-auto max-w-sm rounded-3xl border-2 border-[var(--color-border-strong)] bg-[var(--color-ink)] p-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <span className="text-xs font-bold text-[var(--color-paper)]">Mendoza Barber Studio</span>
            <span className="text-[10px] text-emerald-400 font-medium">● Abierto</span>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold">1. Servicio</span>
              <p className="text-xs font-semibold text-[var(--color-paper)] mt-0.5">Fade Clásico + Barba</p>
              <span className="text-[11px] text-[var(--color-brass)] font-semibold">$1,200 DOP (45 min)</span>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold">2. Profesional</span>
              <p className="text-xs font-semibold text-[var(--color-paper)] mt-0.5">Carlos Mendoza (Master)</p>
            </div>
            <div className="rounded-xl border border-[var(--color-brass)]/40 bg-[var(--color-brass)]/10 p-3">
              <span className="text-[10px] text-[var(--color-brass)] uppercase tracking-wider font-semibold">3. Horario Seleccionado</span>
              <p className="text-xs font-bold text-[var(--color-paper)] mt-0.5">Hoy · 15:00 - 15:45</p>
            </div>
            <button
              type="button"
              className="w-full rounded-xl bg-[var(--color-brass)] py-2.5 text-xs font-semibold text-white shadow-md cursor-pointer hover:bg-[var(--color-brass-hover)]"
            >
              Confirmar Cita por WhatsApp →
            </button>
          </div>
        </div>
      ),
    },
    barbero: {
      title: "Para el Barbero",
      badge: "Independencia Operativa",
      headline: "Su agenda diaria clara en el móvil, sin ver números ajenos",
      description:
        "Cada profesional tiene su propio acceso. Puede gestionar sus horarios de disponibilidad, ver sus citas asignadas y saber exactamente cuánto cobrará al final de la jornada según su esquema de comisiones.",
      preview: (
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-[var(--color-brass)] text-white text-xs font-bold flex items-center justify-center">
                CM
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--color-paper)]">Carlos Mendoza</p>
                <p className="text-[10px] text-[var(--color-muted)]">Turno: 09:00 - 19:00</p>
              </div>
            </div>
            <span className="rounded-full bg-[var(--color-brass)]/10 border border-[var(--color-brass)]/30 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-brass)]">
              6 Citas hoy
            </span>
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 flex justify-between items-center text-xs">
              <div>
                <span className="font-mono text-emerald-400 font-semibold">14:00 - 14:45</span>
                <p className="font-medium text-[var(--color-paper)]">Gabriel M. · Corte VIP</p>
              </div>
              <span className="text-emerald-400 text-[11px] font-semibold">Completada</span>
            </div>
            <div className="rounded-lg border border-[var(--color-brass)]/50 bg-[var(--color-surface-raised)] p-3 flex justify-between items-center text-xs">
              <div>
                <span className="font-mono text-[var(--color-brass)] font-semibold">15:00 - 15:45</span>
                <p className="font-medium text-[var(--color-paper)]">Roberto V. · Fade Clásico</p>
              </div>
              <span className="rounded bg-[var(--color-brass)] text-white px-2 py-0.5 text-[10px] font-semibold">
                Siguiente
              </span>
            </div>
          </div>
          <div className="mt-4 border-t border-[var(--color-border)] pt-3 flex justify-between text-xs font-medium">
            <span className="text-[var(--color-muted)]">Mi comisión acumulada hoy:</span>
            <span className="text-emerald-400 font-bold">$7,200 DOP</span>
          </div>
        </div>
      ),
    },
    recepcion: {
      title: "Para Recepción",
      badge: "Control Central",
      headline: "Visión panorámica de todos los sillones y caja rápida",
      description:
        "Recepción tiene el pulso completo del negocio: clientes que van llegando, citas en progreso, reasignación de profesionales en caso de urgencias y generación de recibos en mostrador en un par de clics.",
      preview: (
        <div className="mx-auto max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 text-xs">
            <span className="font-bold text-[var(--color-paper)]">Tablero de Mostrador</span>
            <span className="font-mono text-[var(--color-muted)]">4 de 4 sillas operando</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)] p-3">
              <span className="text-[10px] text-emerald-400 font-semibold block">Sillón 1 · Ocupado</span>
              <p className="font-medium text-[var(--color-paper)] mt-1">Carlos M. - Termina 15:45</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)] p-3">
              <span className="text-[10px] text-emerald-400 font-semibold block">Sillón 2 · Ocupado</span>
              <p className="font-medium text-[var(--color-paper)] mt-1">Marcos D. - Termina 16:00</p>
            </div>
            <div className="rounded-xl border border-dashed border-[var(--color-border)] p-3">
              <span className="text-[10px] text-[var(--color-muted)] font-semibold block">Sillón 3 · Libre</span>
              <p className="text-[var(--color-faint)] mt-1">Disponible para cliente espontáneo</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)] p-3">
              <span className="text-[10px] text-yellow-400 font-semibold block">Sillón 4 · Esperando</span>
              <p className="font-medium text-[var(--color-paper)] mt-1">Cita 15:30 próxima</p>
            </div>
          </div>
        </div>
      ),
    },
    dueno: {
      title: "Para el Dueño",
      badge: "Métricas Financieras",
      headline: "Informes de ingresos netos, ocupación y auditoría en tiempo real",
      description:
        "Toma decisiones con números duros. Consulta ingresos por día, semana o mes, desglose por servicio más rentable, rendimiento de cada barbero y mantén el control fiscal y operativo sin sorpresas.",
      preview: (
        <div className="mx-auto max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <span className="text-xs font-bold text-[var(--color-paper)]">Panel Ejecutivo de Dirección</span>
            <span className="text-xs text-emerald-400 font-semibold">+28% vs. mes anterior</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl bg-[var(--color-ink)] p-3 border border-[var(--color-border)]">
              <span className="text-[10px] text-[var(--color-muted)]">Facturación Mes</span>
              <p className="text-base font-bold text-[var(--color-paper)] mt-1">$482,500</p>
            </div>
            <div className="rounded-xl bg-[var(--color-ink)] p-3 border border-[var(--color-border)]">
              <span className="text-[10px] text-[var(--color-muted)]">Margen Negocio</span>
              <p className="text-base font-bold text-emerald-400 mt-1">$193,000</p>
            </div>
            <div className="rounded-xl bg-[var(--color-ink)] p-3 border border-[var(--color-border)]">
              <span className="text-[10px] text-[var(--color-muted)]">Tasa Ocupación</span>
              <p className="text-base font-bold text-[var(--color-paper)] mt-1">94.2%</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3 text-xs flex justify-between items-center">
            <span className="text-[var(--color-muted)]">Cierre de caja automático:</span>
            <span className="text-emerald-400 font-semibold">Listo para conciliar</span>
          </div>
        </div>
      ),
    },
  };

  const current = TABS[activeTab];

  return (
    <section id="demo" className="py-24 sm:py-32 border-t border-[var(--color-border)] bg-[var(--color-ink)]">
      <Container size="wide">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-brass)] font-semibold uppercase tracking-wider mb-4">
              Demostración en Vivo
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--color-paper)]">
              Una plataforma, cuatro perspectivas perfectas
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[var(--color-muted)]">
              Kortek se adapta a cada persona de tu organización. Haz clic para ver cómo lo vive cada rol:
            </p>

            {/* Selector de pestañas de rol */}
            <div className="mt-8 inline-flex flex-wrap justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 gap-1 shadow-md">
              {(Object.keys(TABS) as RoleTab[]).map((tabKey) => {
                const tab = TABS[tabKey];
                const isActive = activeTab === tabKey;
                return (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setActiveTab(tabKey)}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-[var(--color-brass)] text-white shadow-md shadow-[rgba(225,29,46,0.3)]"
                        : "text-[var(--color-muted)] hover:text-[var(--color-paper)] hover:bg-[var(--color-surface-raised)]"
                    }`}
                  >
                    {tab.title}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Panel Interactivo Activo */}
        <Reveal delay={120}>
          <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
            <div key={`text-${activeTab}`} className="lg:col-span-5 space-y-4 animate-fade-in">
              <span className="inline-block rounded-full bg-[var(--color-brass)]/10 border border-[var(--color-brass)]/30 px-3 py-1 text-xs font-semibold text-[var(--color-brass)]">
                {current.badge}
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[var(--color-paper)] leading-snug">
                {current.headline}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                {current.description}
              </p>
            </div>

            <div key={`preview-${activeTab}`} className="lg:col-span-7 flex justify-center animate-fade-in">
              {current.preview}
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
