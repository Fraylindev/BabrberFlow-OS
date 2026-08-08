"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, AnalyticsDashboard, Booking, Professional } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { TrendStat } from "@/components/ui/TrendStat";
import { Reveal } from "@/components/ui/Reveal";
import { useAuth } from "@/lib/auth-context";

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

const TODAY_LABEL = new Date().toLocaleDateString("es-DO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default function DashboardHome() {
  const { user, organization } = useAuth();
  const canSeeAnalytics = user?.role !== "BARBER";

  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [professionals, setProfessionals] = useState<Professional[] | null>(
    null
  );
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [nextBookingId, setNextBookingId] = useState<string | undefined>(
    undefined
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Booking[]>("/bookings"),
      api.get<Professional[]>("/professionals"),
      canSeeAnalytics
        ? api.get<AnalyticsDashboard>("/analytics/dashboard")
        : Promise.resolve(null),
    ])
      .then(([b, p, a]) => {
        setBookings(b);
        setProfessionals(p);
        setAnalytics(a);
        const now = Date.now();
        const todayList = b
          .filter((x) => isToday(x.startTime) && x.status !== "CANCELLED")
          .sort((x, y) => x.startTime.localeCompare(y.startTime));
        setNextBookingId(
          todayList.find((x) => new Date(x.startTime).getTime() >= now)?.id
        );
      })
      .catch(() => setError("No pudimos cargar el resumen. Intenta recargar."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = bookings === null || professionals === null;
  const todayBookings = (bookings || [])
    .filter((b) => isToday(b.startTime))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const completedToday = todayBookings.filter(
    (b) => b.status === "COMPLETED"
  ).length;

  const activeProfessionals = (professionals || []).filter(
    (p) => p.isActive !== false
  );
  const workload = activeProfessionals.map((p) => ({
    professional: p,
    count: todayBookings.filter((b) => b.professionalId === p.id).length,
  }));

  const isBrandNew =
    !loading &&
    (professionals?.length ?? 0) === 0 &&
    (bookings?.length ?? 0) === 0;

  // Alertas accionables de negocio reales (Sin inventar flujos bancarios)
  const alerts: { text: string; subtext: string; href: string }[] = [];
  if (analytics) {
    if (analytics.bookings.pending > 0) {
      alerts.push({
        text: `${analytics.bookings.pending} reserva${
          analytics.bookings.pending > 1 ? "s" : ""
        } pendiente${analytics.bookings.pending > 1 ? "s" : ""} por confirmar`,
        subtext: "Revisa y confirma las citas entrantes en tu agenda.",
        href: "/dashboard/bookings",
      });
    }
    if (analytics.bookings.cancelled > 0) {
      alerts.push({
        text: `${analytics.bookings.cancelled} reserva${
          analytics.bookings.cancelled > 1 ? "s" : ""
        } cancelada${analytics.bookings.cancelled > 1 ? "s" : ""} hoy`,
        subtext:
          "Horarios liberados disponibles para clientes sin cita previa.",
        href: "/dashboard/bookings",
      });
    }
  }

  // Porcentaje de carga operativa completada hoy
  const completionRate =
    todayBookings.length > 0
      ? Math.round((completedToday / todayBookings.length) * 100)
      : 0;

  // Próxima cita del día para resaltar como protagonista
  const nextBooking = todayBookings.find((b) => b.id === nextBookingId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto min-w-0">
      {/* ENCABEZADO SAAS LIMPIO CON JERARQUÍA VISUAL */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--dash-border)] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
            <span>{organization?.name || "Kortek Booking"}</span>
            <span>•</span>
            <span className="capitalize">{TODAY_LABEL}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
            {greeting()}, {user?.name?.split(" ")[0] ?? ""}
          </h1>
        </div>

        {/* Píldora de estado operativo limpia y separada */}
        <div className="flex items-center gap-2.5 self-start sm:self-center rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 shadow-2xs">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {todayBookings.length === 0
              ? "Sin citas programadas hoy"
              : `${todayBookings.length} reserva${
                  todayBookings.length !== 1 ? "s" : ""
                } hoy`}
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600 font-semibold">
            {activeProfessionals.length} activo{activeProfessionals.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* RENDERIZADO DEL ESTADO ERROR */}
      {error && (
        <p className="rounded-sm bg-[#fee2e2] px-3 py-2 text-sm text-[#b91c1c]">
          {error}
        </p>
      )}

      {/* 4 KPIS OPERATIVOS CON CONTEXTO (GRID RESPONSIVE 2x2 en móvil) */}
      {canSeeAnalytics && (
        <Reveal>
          <Card tone="light" className="p-4 sm:p-6 transition-all duration-200">
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
                  previousLabel={`Ayer: ${formatMoney(
                    analytics.revenue.yesterday
                  )}`}
                />
                <TrendStat
                  label="Últimos 7 días"
                  value={analytics.revenue.last7Days}
                  displayValue={formatMoney(analytics.revenue.last7Days)}
                  previousLabel={`Promedio: ${formatMoney(
                    Math.round(analytics.revenue.last7Days / 7)
                  )}/día`}
                />
                <TrendStat
                  label="Reservas hoy"
                  value={analytics.bookings.today}
                  displayValue={String(analytics.bookings.today)}
                  previousLabel="Citas agendadas en total"
                />
                <TrendStat
                  label="Completadas hoy"
                  value={completedToday}
                  displayValue={String(completedToday)}
                  previousLabel={`${completionRate}% de la carga diaria`}
                />
              </div>
            )}
          </Card>
        </Reveal>
      )}

      {/* ALERTAS Y PRIORIDADES ACCIONABLES */}
      {alerts.length > 0 && (
        <Reveal delay={80}>
          <Card tone="light" className="p-5 border-red-100 bg-red-50/30">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-red-800">
              Alertas y Prioridades de hoy
            </p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {alerts.map((a) => (
                <li key={a.text}>
                  <Link
                    href={a.href}
                    className="group flex flex-col justify-center rounded-md border border-gray-200/80 bg-white p-3.5 shadow-2xs transition-all duration-150 hover:border-red-500 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" />
                        <span className="truncate text-sm font-semibold text-gray-900">
                          {a.text}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-red-600 group-hover:underline shrink-0">
                        Resolver ↗
                      </span>
                    </div>
                    <p className="mt-1 pl-4 text-xs text-gray-500">
                      {a.subtext}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      )}

      {/* ESTADO ONBOARDING (Negocio nuevo sin datos) */}
      {isBrandNew ? (
        <Reveal delay={120}>
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
                    <Button variant="secondary" tone="light">
                      Agregar servicio
                    </Button>
                  </Link>
                </div>
              }
            />
          </Card>
        </Reveal>
      ) : (
        /* ÁREA DE TRABAJO PRINCIPAL */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6 min-w-0">
            {/* PRÓXIMA CITA INMEDIATA */}
            {nextBooking && (
              <Reveal delay={120}>
                <Card
                  tone="light"
                  className="p-4 border-l-4 border-l-red-600 bg-red-50/20 transition-all duration-200"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                    Próxima cita inmediata • Hoy
                  </p>
                  <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-display text-base font-bold text-gray-900">
                        {new Date(nextBooking.startTime).toLocaleTimeString(
                          "es-DO",
                          { hour: "2-digit", minute: "2-digit" }
                        )}{" "}
                        — {nextBooking.client?.name ?? "Cliente"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {nextBooking.service?.name ?? "Servicio"} con{" "}
                        <span className="font-semibold text-gray-900">
                          {nextBooking.professional?.name ?? "Profesional"}
                        </span>
                      </p>
                    </div>
                    <Badge status={nextBooking.status} tone="light" />
                  </div>
                </Card>
              </Reveal>
            )}

            {/* AGENDA DE HOY */}
            <Reveal delay={140}>
              <Card
                tone="light"
                className="overflow-hidden transition-all duration-200"
              >
                <div className="border-b border-[var(--dash-border)] px-5 py-4 flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-[var(--dash-text)]">
                    Agenda de hoy
                  </h2>
                  <span className="text-xs font-medium text-gray-500">
                    {todayBookings.length} citas en total
                  </span>
                </div>

                <div className="p-5">
                  {loading ? (
                    <div className="flex flex-col divide-y divide-[var(--dash-border)]">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex flex-col gap-2">
                            <Skeleton tone="light" className="h-4 w-40" />
                            <Skeleton tone="light" className="h-3 w-24" />
                          </div>
                          <Skeleton tone="light" className="h-6 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : todayBookings.length === 0 ? (
                    /* EMPTY STATE COMPACTO */
                    <div className="py-8 text-center flex flex-col items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-lg mb-3">
                        🗓️
                      </div>
                      <p className="text-sm font-semibold text-gray-800">
                        No tienes reservas para hoy
                      </p>
                      <p className="text-xs text-gray-500 max-w-xs mt-1 mb-4">
                        Cuando se agenden citas, aparecerán organizadas aquí
                        automáticamente.
                      </p>
                      <Link href="/dashboard/bookings">
                        <Button variant="secondary" tone="light">
                          + Crear reserva rápida
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <ul className="flex flex-col divide-y divide-[var(--dash-border)]">
                      {todayBookings.map((b) => (
                        <li
                          key={b.id}
                          className={`flex items-center justify-between gap-3 py-3 pl-3 transition-all duration-150 hover:translate-x-0.5 hover:bg-[var(--dash-surface-raised)] ${
                            b.id === nextBookingId
                              ? "border-l-2 border-red-600 bg-red-50/10"
                              : "border-l-2 border-transparent"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--dash-text)]">
                              {b.client?.name ?? "Cliente"} ·{" "}
                              {b.service?.name ?? "Servicio"}
                            </p>
                            <p className="truncate text-xs text-[var(--dash-text-muted)]">
                              {new Date(b.startTime).toLocaleTimeString(
                                "es-DO",
                                { hour: "2-digit", minute: "2-digit" }
                              )}{" "}
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
                </div>
              </Card>
            </Reveal>
          </div>

          {/* COLUMNA DERECHA: CARGA DE HOY, PROFESIONAL DEL MES & MOVIMIENTOS */}
          <Reveal delay={160} className="flex flex-col gap-6">
            {canSeeAnalytics && (
              <Card tone="light" className="p-5 transition-all duration-200">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                  Carga operativa de hoy
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
                      <li
                        key={w.professional.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={w.professional.name} size="sm" />
                          <p className="truncate text-sm font-medium text-[var(--dash-text)]">
                            {w.professional.name}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-sm">
                          {w.count} cita{w.count !== 1 ? "s" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {canSeeAnalytics && (
              <Card tone="light" className="p-6 transition-all duration-200">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
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
                      <p className="truncate font-display text-lg font-bold text-[var(--dash-text)]">
                        {analytics.topProfessional.name}
                      </p>
                      <p className="text-xs text-amber-500 font-bold mt-0.5">
                        ★ ★ ★ ★ ★
                      </p>
                      <p className="text-xs text-[var(--dash-text-muted)] mt-1">
                        {analytics.topProfessional.completedBookings} citas
                        completadas • últimos 30 días
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

            {/* ACTIVIDAD DEL DÍA */}
            {todayBookings.length > 0 && (
              <Card
                tone="light"
                className="p-5 border-gray-200/80 bg-gray-50/50"
              >
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--dash-text-muted)]">
                  Movimientos de hoy
                </p>
                <ul className="space-y-2.5">
                  {todayBookings.slice(0, 4).map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between text-xs text-gray-600"
                    >
                      <span className="truncate min-w-0 font-medium">
                        • {b.client?.name ?? "Cliente"} ({b.service?.name})
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-gray-400">
                        {new Date(b.startTime).toLocaleTimeString("es-DO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </Reveal>
        </div>
      )}
    </div>
  );
}
