"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { api, AnalyticsDashboard, DashboardOperationalSummary } from "@/lib/api";
import { BusinessTime } from '@/components/ui/BusinessTime';
import { loadDashboardSummary, summaryGreeting } from "@/lib/dashboard-summary-load";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { SummaryPagination } from "@/components/dashboard/SummaryPagination";
import { TrendStat } from "@/components/ui/TrendStat";
import { Reveal } from "@/components/ui/Reveal";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import {
  INITIAL_DASHBOARD_SUMMARY_STATE,
  dashboardSummaryForScope,
  dashboardSummaryReducer,
  dashboardSummaryScopeKey,
} from "@/lib/dashboard-summary-state";

export default function DashboardHome() {
  const { user } = useAuth();
  return <DashboardHomeScope key={dashboardSummaryScopeKey(user) ?? "no-context"} />;
}

function DashboardHomeScope() {
  const { user, organization } = useAuth();
  const { toast } = useToast();
  // Analytics es solo para roles con visión de negocio — un BARBER
  // recibe 403 de este endpoint (ve únicamente su propia agenda).
  const canSeeAnalytics = user?.role !== "BARBER";
  const canCreateClient = user?.role !== "BARBER";
  const canCreateCatalog = user?.role === "OWNER" || user?.role === "ADMIN";
  const [agendaPage, setAgendaPage] = useState(1);
  const [workloadPage, setWorkloadPage] = useState(1);
  const authScopeKey = dashboardSummaryScopeKey(user);
  const scopeKey = authScopeKey ? `${authScopeKey}:${agendaPage}:${workloadPage}` : null;
  const requestIdRef = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [summaryState, dispatchSummary] = useReducer(
    dashboardSummaryReducer,
    INITIAL_DASHBOARD_SUMMARY_STATE,
  );

  // Nunca renderizar datos cuyo alcance no coincida con el contexto actual.
  // Esto los oculta en el mismo render del cambio, antes de que corra el efecto
  // que inicia la carga nueva.
  const currentSummary = dashboardSummaryForScope(summaryState, scopeKey);
  const operational = currentSummary?.data?.operational ?? null;
  const analytics = currentSummary?.data?.analytics ?? null;
  const nextBookingId = operational?.agenda.nextBookingId;
  const error = currentSummary?.error ?? currentSummary?.data?.operationalError ?? null;
  const analyticsError = currentSummary?.data?.analyticsError ?? null;

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!scopeKey) {
      dispatchSummary({ type: "reset", requestId });
      return;
    }

    let active = true;
    const controller = new AbortController();
    dispatchSummary({ type: "start", scopeKey, requestId });

    loadDashboardSummary(
      api.get<DashboardOperationalSummary>("/analytics/summary", { agendaPage: String(agendaPage), workloadPage: String(workloadPage) }, { signal: controller.signal }),
      canSeeAnalytics ? api.get<AnalyticsDashboard>("/analytics/dashboard", undefined, { signal: controller.signal }) : Promise.resolve(null),
    )
      .then((data) => {
        if (!active) return;
        dispatchSummary({
          type: "success",
          scopeKey,
          requestId,
          data,
        });
      })
      .catch(() => {
        if (!active) return;
        dispatchSummary({
          type: "error",
          scopeKey,
          requestId,
          message: "No pudimos cargar el resumen. Intenta recargar.",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [canSeeAnalytics, reloadKey, scopeKey, agendaPage, workloadPage]);

  const loading = currentSummary?.loading ?? true;
  const todayBookings = operational?.agenda.items ?? [];
  const completedToday = operational?.agenda.completed ?? 0;
  const workload = operational?.workload?.items ?? [];
  const idleCount = operational?.workload?.idleCount ?? 0;

  const publicUrl =
    typeof window !== "undefined" && organization
      ? `${window.location.origin}/${organization.slug}`
      : "";

  async function copyPublicLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast("Enlace copiado", "success");
    } catch {
      toast("No pudimos copiar el enlace", "error");
    }
  }

  // Negocio recién creado: sin profesionales y sin ninguna cita todavía
  // — la agenda vacía y los widgets de carga no aportan nada útil
  // todavía, mejor guiar los primeros pasos.
  const isBrandNew = canCreateCatalog && !error && !loading && operational?.isBrandNew;

  const alerts: { text: string; href: string }[] = [];
  if (analytics) {
    if (analytics.bookings.cancelled > 0) {
      alerts.push({
        text: `${analytics.bookings.cancelled} reserva${analytics.bookings.cancelled > 1 ? "s" : ""} cancelada${
          analytics.bookings.cancelled > 1 ? "s" : ""
        } hoy`,
        href: "/dashboard/bookings",
      });
    }
    if (analytics.bookings.pending > 0) {
      alerts.push({
        text: `${analytics.bookings.pending} reserva${analytics.bookings.pending > 1 ? "s" : ""} pendiente${
          analytics.bookings.pending > 1 ? "s" : ""
        } por confirmar`,
        href: "/dashboard/bookings",
      });
    }
    if (!isBrandNew && idleCount > 0) {
      alerts.push({
        text: `${idleCount} profesional${idleCount === 1 ? "" : "es"} sin citas hoy`,
        href: "/dashboard/professionals",
      });
    }
  }

  return (
    <div>
      {/* "Ver página pública" / "Copiar enlace" viven únicamente en el
          menú de usuario del Topbar — visibles desde cualquier
          pantalla. No se duplican aquí. */}
      <PageHeader
        tone="light"
        title={`${operational ? summaryGreeting(operational.generatedAt, operational.timeZone) : "Hola"}, ${user?.name?.split(" ")[0] ?? ""}`}
        description={operational ? <BusinessTime value={operational.generatedAt} zone={operational.timeZone} /> : "Resumen del negocio"}
      />

      {(error || analyticsError) && (
        <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-sm border border-[var(--dash-danger)]/30 bg-[var(--dash-danger-bg)] px-4 py-3 sm:flex-row sm:items-center">
          <div role="alert" className="text-sm text-[var(--dash-danger)]">{error && <p>{error}</p>}{analyticsError && <p>{analyticsError}</p>}</div>
          <Button
            type="button"
            tone="light"
            variant="secondary"
            className="shrink-0"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Reintentar
          </Button>
        </div>
      )}

      {canSeeAnalytics && !analyticsError && (
        <Reveal>
          <Card tone="light" className="mb-6 p-4 sm:p-6">
            {loading || !analytics ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 sm:gap-x-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <Skeleton tone="light" className="h-3 w-20" />
                    <Skeleton tone="light" className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 sm:gap-x-8">
                <TrendStat
                  label="Ingresos hoy"
                  value={analytics.revenue.today}
                  displayValue={formatMoney(analytics.revenue.today)}
                  previousValue={analytics.revenue.yesterday}
                  previousLabel={`Ayer: ${formatMoney(analytics.revenue.yesterday)}`}
                />
                <TrendStat
                  label="Últimos 7 días"
                  value={analytics.revenue.last7Days}
                  displayValue={formatMoney(analytics.revenue.last7Days)}
                />
                <TrendStat
                  label="Reservas hoy"
                  value={analytics.bookings.today}
                  displayValue={String(analytics.bookings.today)}
                />
                {/* Reemplaza "Pendientes por confirmar": ese número ya
                    vive en Alertas (con acceso directo a resolverlo).
                    "Completadas hoy" da la señal de productividad del
                    día que Ingresos ya no puede dar por sí sola, ahora
                    que completar una cita no factura automáticamente
                    (ver PROJECT_MASTER.md §52.1/§52.2). */}
                {!error && <TrendStat
                  label="Completadas hoy"
                  value={completedToday}
                  displayValue={String(completedToday)}
                />}
              </div>
            )}
          </Card>
        </Reveal>
      )}

      {/* Acciones rápidas — las acciones más frecuentes a un clic desde
          el resumen, filtradas por lo que el rol realmente puede hacer. */}
      <Reveal delay={80}>
        <div className="mb-6 flex flex-wrap gap-3">
          <Link href="/dashboard/bookings">
            <Button tone="light">+ Nueva reserva</Button>
          </Link>
          {canCreateClient && (
            <Link href="/dashboard/clients">
              <Button variant="secondary" tone="light">+ Nuevo cliente</Button>
            </Link>
          )}
          {canCreateCatalog && (
            <>
              <Link href="/dashboard/services">
                <Button variant="secondary" tone="light">+ Nuevo servicio</Button>
              </Link>
              <Link href="/dashboard/professionals">
                <Button variant="secondary" tone="light">+ Nuevo profesional</Button>
              </Link>
            </>
          )}
        </div>
      </Reveal>

      {!error && alerts.length > 0 && (
        <Reveal delay={120}>
          <Card tone="light" className="mb-6 p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--dash-text-muted)]">
              Alertas de hoy
            </p>
            <ul className="flex flex-col gap-2">
              {alerts.map((a) => (
                <li key={a.text}>
                  <Link
                    href={a.href}
                    className="group flex items-center gap-2 text-sm text-[var(--dash-text)] transition-[color,transform] duration-150 hover:translate-x-0.5 hover:text-[var(--dash-accent)]"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--dash-accent)] transition-transform duration-150 group-hover:scale-125" />
                    <span className="min-w-0 truncate">{a.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      )}

      {!error && (isBrandNew ? (
        <Reveal delay={160}>
          <Card tone="light" className="p-6 sm:p-8">
            <EmptyState
              tone="light"
              title="Empecemos a configurar tu barbería"
              description="Todavía no tienes profesionales ni citas registradas. Estos son los primeros pasos para dejar tu negocio listo para recibir reservas."
              action={
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <Link href="/dashboard/professionals">
                    <Button tone="light">Agregar profesional</Button>
                  </Link>
                  <Link href="/dashboard/services">
                    <Button variant="secondary" tone="light">Agregar servicio</Button>
                  </Link>
                  {organization && (
                    <Button variant="secondary" tone="light" onClick={copyPublicLink}>
                      Compartir tu página
                    </Button>
                  )}
                </div>
              }
            />
          </Card>
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Reveal delay={160}>
            <Card tone="light">
              <div className="border-b border-[var(--dash-border)] px-5 py-4">
                <h2 className="font-[family-name:var(--font-display)] text-base text-[var(--dash-text)]">
                  Agenda de hoy
                </h2>
              </div>
              <div className="p-5">
                {loading ? (
                  <div className="flex flex-col divide-y divide-[var(--dash-border)]">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between py-3">
                        <div className="flex flex-col gap-2">
                          <Skeleton tone="light" className="h-4 w-40" />
                          <Skeleton tone="light" className="h-3 w-24" />
                        </div>
                        <Skeleton tone="light" className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                ) : todayBookings.length === 0 ? (
                  <EmptyState
                    tone="light"
                    title="Sin citas para hoy"
                    description="Cuando se agenden citas para hoy, aparecerán aquí."
                    action={
                      <Link href="/dashboard/bookings">
                        <Button variant="secondary" tone="light">Crear una reserva</Button>
                      </Link>
                    }
                  />
                ) : (
                  <ul className="flex flex-col divide-y divide-[var(--dash-border)]">
                    {todayBookings.map((b) => (
                      <li
                        key={b.id}
                        className={`flex items-center justify-between gap-3 py-3 pl-3 transition-[background-color,transform] duration-150 hover:translate-x-0.5 hover:bg-[var(--dash-surface-raised)] ${
                          b.id === nextBookingId ? "border-l-2 border-[var(--dash-accent)]" : "border-l-2 border-transparent"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-[var(--dash-text)]">
                            {b.client?.name ?? "Cliente"} · {b.service?.name ?? "Servicio"}
                          </p>
                          <p className="truncate text-xs text-[var(--dash-text-muted)]">
                            <BusinessTime value={b.startTime} zone={operational?.timeZone} />{" "}
                            con {b.professional?.name ?? "profesional"}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <Badge status={b.status} tone="light" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {!loading && operational && <SummaryPagination label="Páginas de agenda de hoy" page={operational.agenda.page} totalPages={operational.agenda.totalPages} onPage={setAgendaPage} />}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={220} className="flex flex-col gap-6">
            {canSeeAnalytics && (
              <Card tone="light" className="p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--dash-text-muted)]">
                  Carga de hoy
                </p>
                {loading ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} tone="light" className="h-8 w-full" />
                    ))}
                  </div>
                ) : workload.length === 0 ? (
                  <EmptyState
                    tone="light"
                    title="Sin profesionales activos"
                    description="Agrega profesionales para ver su carga del día."
                  />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {workload.map((w) => (
                      <li key={w.id} className="flex items-center gap-3">
                        <Avatar name={w.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-[var(--dash-text)]">
                            {w.name}
                          </p>
                        </div>
                        <span className="shrink-0 font-[family-name:var(--font-mono)] text-sm text-[var(--dash-text-muted)]">
                          {w.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {!loading && operational?.workload && <SummaryPagination label="Páginas de carga de hoy" page={operational.workload.page} totalPages={operational.workload.totalPages} onPage={setWorkloadPage} />}
              </Card>
            )}

            {canSeeAnalytics && !analyticsError && (
              <Card tone="light" className="p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--dash-text-muted)]">
                  Profesional del mes
                </p>
                {loading || !analytics ? (
                  <div className="mt-4 flex items-center gap-3">
                    <Skeleton tone="light" className="h-12 w-12 rounded-full" />
                    <div className="flex flex-col gap-2">
                      <Skeleton tone="light" className="h-4 w-28" />
                      <Skeleton tone="light" className="h-3 w-20" />
                    </div>
                  </div>
                ) : analytics.topProfessional ? (
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar name={analytics.topProfessional.name} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate font-[family-name:var(--font-display)] text-lg text-[var(--dash-text)]">
                        {analytics.topProfessional.name}
                      </p>
                      <p className="text-xs text-[var(--dash-text-muted)]">
                        {analytics.topProfessional.completedBookings} citas completadas · últimos 30 días
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[var(--dash-text-muted)]">
                    Todavía no hay suficientes citas completadas este mes.
                  </p>
                )}
              </Card>
            )}
          </Reveal>
        </div>
      ))}
    </div>
  );
}
