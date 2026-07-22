"use client";

import { useEffect, useState } from "react";
import { api, Booking, Client, Professional, Service } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
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

export default function DashboardHome() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [professionals, setProfessionals] = useState<Professional[] | null>(null);
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Booking[]>("/bookings"),
      api.get<Client[]>("/clients"),
      api.get<Professional[]>("/professionals"),
      api.get<Service[]>("/services"),
    ])
      .then(([b, c, p, s]) => {
        setBookings(b);
        setClients(c);
        setProfessionals(p);
        setServices(s);
      })
      .catch(() => setError("No pudimos cargar el resumen. Intenta recargar."));
  }, []);

  const loading = bookings === null;
  const todayBookings = (bookings || [])
    .filter((b) => isToday(b.startTime))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const stats = [
    { label: "Citas hoy", value: todayBookings.length },
    { label: "Clientes", value: clients?.length ?? "—" },
    { label: "Profesionales", value: professionals?.length ?? "—" },
    { label: "Servicios", value: services?.length ?? "—" },
  ];

  return (
    <div>
      <PageHeader
        title={`Hola, ${user?.name?.split(" ")[0] ?? ""}`}
        description="Esto es lo que está pasando hoy en tu barbería."
      />

      {error && (
        <p className="mb-6 rounded-sm bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="font-[family-name:var(--font-mono)] text-2xl text-[var(--color-brass)]">
              {loading ? "…" : s.value}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-[var(--color-muted)]">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="font-[family-name:var(--font-display)] text-base text-[var(--color-paper)]">
            Agenda de hoy
          </h2>
        </div>
        <div className="p-5">
          {loading ? (
            <p className="text-sm text-[var(--color-muted)]">Cargando…</p>
          ) : todayBookings.length === 0 ? (
            <EmptyState
              title="Sin citas para hoy"
              description="Cuando se agenden citas para hoy, aparecerán aquí."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--color-border)]">
              {todayBookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-[var(--color-paper)]">
                      {b.client?.name ?? "Cliente"} · {b.service?.name ?? "Servicio"}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {new Date(b.startTime).toLocaleTimeString("es-DO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      con {b.professional?.name ?? "profesional"}
                    </p>
                  </div>
                  <Badge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
