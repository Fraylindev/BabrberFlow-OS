import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

export function FeaturesBento() {
  return (
    <section id="features" className="py-24 sm:py-32 relative">
      <Container size="wide">
        {/* Cabecera de la sección */}
        <Reveal>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-brass)] font-semibold uppercase tracking-wider mb-4">
              <span>Arquitectura y Capacidades</span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--color-paper)] leading-tight">
              Cada parte de tu barbería,{" "}
              <span className="text-[var(--color-brass)]">bajo control absoluto.</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[var(--color-muted)] leading-relaxed">
              Nada de herramientas genéricas de oficina adaptadas a la fuerza. Kortek Booking fue construido específicamente para la velocidad y el dinamismo de un salón concurrido.
            </p>
          </div>
        </Reveal>

        {/* Bento Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Agenda Multi-Sillón (2 Col span en desktop) */}
          <Reveal delay={0} className="lg:col-span-2">
            <div className="h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 flex flex-col justify-between hover:border-[var(--color-border-strong)] transition-all duration-300 shadow-[var(--shadow-card)] group">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-brass)] group-hover:border-[var(--color-brass)]/40 transition-colors">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-brass)] font-semibold">
                      01 · Motor de Citas
                    </span>
                  </div>
                  <span className="rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] px-2.5 py-0.5 text-[11px] text-[var(--color-muted)]">
                    Cero choques de turno
                  </span>
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-paper)]">
                  Agenda Multi-Sillón en Tiempo Real
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)] max-w-xl leading-relaxed">
                  Control simultáneo de múltiples profesionales. El algoritmo detecta al instante si un barbero tiene un turno previo, respeta las pausas de descanso y bloquea automáticamente citas superpuestas.
                </p>
              </div>

              {/* Visual interactivo simulado */}
              <div className="mt-8 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-ink)] p-4 sm:p-5">
                <div className="flex items-center justify-between text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] pb-2 mb-3">
                  <span className="font-mono">Timeline de Sillas Activas</span>
                  <span className="text-emerald-400 font-medium">Validación en 12ms</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between rounded-lg bg-[var(--color-surface-raised)] p-2.5 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-[var(--color-brass)]" />
                      <span className="font-medium text-[var(--color-paper)]">Sillón 1 (Carlos M.)</span>
                      <span className="text-[var(--color-muted)] hidden sm:inline">11:00 - 11:45 · Corte & Barba</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono font-medium">Asignada</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[var(--color-surface-raised)] p-2.5 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                      <span className="font-medium text-[var(--color-paper)]">Sillón 2 (Marcos D.)</span>
                      <span className="text-[var(--color-muted)] hidden sm:inline">11:15 - 12:00 · Fade Clásico</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono font-medium">Asignada</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 2: Página Pública de Reservas */}
          <Reveal delay={80}>
            <div className="h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 flex flex-col justify-between hover:border-[var(--color-border-strong)] transition-all duration-300 shadow-[var(--shadow-card)] group">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-brass)] group-hover:border-[var(--color-brass)]/40 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-brass)] font-semibold">
                    02 · Adquisición
                  </span>
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-paper)]">
                  Página Web con tu Marca
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                  Tus clientes reservan directamente desde un link propio (<span className="text-[var(--color-paper)] font-mono">/tu-negocio</span>) sin instalar apps ni crear cuentas forzosas.
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)] p-4 text-xs">
                <div className="flex items-center gap-2 text-[var(--color-muted)] border-b border-[var(--color-border)] pb-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-mono truncate">kortek.app/mendoza-studio</span>
                </div>
                <p className="text-[var(--color-paper)] font-medium">1. Elige Barbero</p>
                <p className="text-[var(--color-paper)] font-medium">2. Selecciona Horario</p>
                <p className="text-emerald-400 font-medium">3. Listo en 20 segundos</p>
              </div>
            </div>
          </Reveal>

          {/* Card 3: Aislamiento Multi-Tenancy */}
          <Reveal delay={160}>
            <div className="h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 flex flex-col justify-between hover:border-[var(--color-border-strong)] transition-all duration-300 shadow-[var(--shadow-card)] group">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-brass)] group-hover:border-[var(--color-brass)]/40 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-brass)] font-semibold">
                    03 · Seguridad
                  </span>
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-paper)]">
                  Multi-Tenancy Estricto
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                  Tus clientes, datos de facturación y notas privadas se encuentran aislados por organización a nivel de base de datos. Ningún otro establecimiento puede acceder a tu información.
                </p>
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-300">
                <svg className="h-5 w-5 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Aislamiento lógico tenant-scoped en cada consulta y mutación.</span>
              </div>
            </div>
          </Reveal>

          {/* Card 4: Facturación y Comisiones */}
          <Reveal delay={240}>
            <div className="h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 flex flex-col justify-between hover:border-[var(--color-border-strong)] transition-all duration-300 shadow-[var(--shadow-card)] group">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-brass)] group-hover:border-[var(--color-brass)]/40 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-brass)] font-semibold">
                    04 · Finanzas
                  </span>
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-paper)]">
                  Facturación y Comisiones
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                  Genera la factura interna con un solo clic al completar la cita. Kortek calcula la comisión del profesional automáticamente, reduciendo errores contables a cero.
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)] p-4 text-xs space-y-2">
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>Corte + Barba VIP</span>
                  <span className="text-[var(--color-paper)] font-semibold">$1,500 DOP</span>
                </div>
                <div className="flex justify-between text-[var(--color-muted)]">
                  <span>Comisión Barbero (60%)</span>
                  <span className="text-emerald-400 font-medium">$900 DOP</span>
                </div>
                <div className="flex justify-between border-t border-[var(--color-border)] pt-2 font-semibold text-[var(--color-paper)]">
                  <span>Retención Negocio</span>
                  <span>$600 DOP</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 5: Roles y Permisos Granulares */}
          <Reveal delay={320}>
            <div className="h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 flex flex-col justify-between hover:border-[var(--color-border-strong)] transition-all duration-300 shadow-[var(--shadow-card)] group">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-brass)] group-hover:border-[var(--color-brass)]/40 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-brass)] font-semibold">
                    05 · Control de Equipo
                  </span>
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-paper)]">
                  4 Roles Especializados
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                  Dueño, Administrador, Recepción y Barbero. Cada integrante ve exactamente lo necesario para su función: los barberos ven sus citas sin acceder a la contabilidad general.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-[var(--color-surface-raised)] p-2.5 text-center">
                  <span className="font-semibold text-[var(--color-paper)] block">Dueño</span>
                  <span className="text-[10px] text-[var(--color-muted)]">Control total</span>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-raised)] p-2.5 text-center">
                  <span className="font-semibold text-[var(--color-paper)] block">Admin</span>
                  <span className="text-[10px] text-[var(--color-muted)]">Equipo y servicios</span>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-raised)] p-2.5 text-center">
                  <span className="font-semibold text-[var(--color-paper)] block">Recepción</span>
                  <span className="text-[10px] text-[var(--color-muted)]">Agenda y caja</span>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-raised)] p-2.5 text-center">
                  <span className="font-semibold text-[var(--color-brass)] block">Barbero</span>
                  <span className="text-[10px] text-[var(--color-muted)]">Agenda propia</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 6: Notificaciones por WhatsApp (2 col span en desktop o destacado) */}
          <Reveal delay={400} className="lg:col-span-3">
            <div className="h-full rounded-2xl border border-[var(--color-border)] bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-surface-raised)] to-[var(--color-surface)] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[var(--shadow-card)] group hover:border-[var(--color-border-strong)] transition-all">
              <div className="max-w-xl">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-brass)] group-hover:border-[var(--color-brass)]/40 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-brass)] font-semibold">
                    06 · Conexión Directa
                  </span>
                </div>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-paper)]">
                  Confirmaciones & WhatsApp Instantáneo
                </h3>
                <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                  Los clientes reciben su recordatorio con enlace directo para confirmar o reprogramar. Olvídate de sillas vacías por olvidos y reduce el absentismo al mínimo.
                </p>
              </div>
              <div className="shrink-0">
                <div className="inline-flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-5 py-3 text-xs font-semibold text-emerald-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Mensajería Transaccional Automatizada</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
