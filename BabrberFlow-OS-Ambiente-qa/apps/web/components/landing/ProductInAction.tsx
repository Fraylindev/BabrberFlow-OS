import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "./Section";

/**
 * Maquetas de producto construidas 100% en HTML/Tailwind con nuestros
 * propios componentes — sin capturas de pantalla reales ni imágenes
 * externas, tal como exige la excepción de contenido estático de la landing.
 */
export function ProductInAction() {
  return (
    <section id="producto" className="px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="El producto en acción"
        title="Así se ve por dentro"
        description="Tres vistas reales del panel: la reserva pública, la agenda del equipo y el cobro."
      />
      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Mockup 1: reserva pública */}
        <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="font-[family-name:var(--font-display)] text-sm text-[var(--color-paper)]">
            Reserva pública
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {["Corte clásico · 30 min", "Corte + barba · 45 min", "Afeitado tradicional · 25 min"].map(
              (service, i) => (
                <div
                  key={service}
                  className={`flex items-center justify-between border px-3 py-2 text-xs ${
                    i === 1
                      ? "border-[var(--color-brass)] text-[var(--color-paper)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)]"
                  }`}
                >
                  <span>{service}</span>
                  {i === 1 && <span className="text-[var(--color-brass)]">●</span>}
                </div>
              ),
            )}
          </div>
        </div>

        {/* Mockup 2: agenda por barbero */}
        <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="font-[family-name:var(--font-display)] text-sm text-[var(--color-paper)]">
            Agenda del equipo
          </p>
          <div className="mt-4 flex flex-col gap-2 text-xs">
            {[
              { name: "Ana", slot: "10:00 – 10:30", status: "CONFIRMED" },
              { name: "Luis", slot: "10:00 – 10:45", status: "PENDING" },
              { name: "Ana", slot: "11:00 – 11:30", status: "COMPLETED" },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-[var(--color-border)] pb-2"
              >
                <span className="text-[var(--color-muted)]">
                  {row.name} · {row.slot}
                </span>
                <Badge status={row.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Mockup 3: facturación */}
        <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="font-[family-name:var(--font-display)] text-sm text-[var(--color-paper)]">
            Cobro al cerrar la cita
          </p>
          <div className="mt-4 flex flex-col gap-3 text-xs text-[var(--color-muted)]">
            <div className="flex items-center justify-between">
              <span>Corte + barba — Josué M.</span>
              <span className="font-[family-name:var(--font-mono)] text-[var(--color-paper)]">
                RD$800
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
              <span>Estado</span>
              <Badge status="PAID" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
