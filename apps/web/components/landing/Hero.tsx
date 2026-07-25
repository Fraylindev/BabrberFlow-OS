import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28">
      {/* Resplandor decorativo — sin imágenes, solo gradiente */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-20 blur-[120px]"
        style={{ background: "var(--color-brass)" }}
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full border border-[var(--color-border-strong)] px-3 py-1 text-xs text-[var(--color-brass)]">
          Hecho para barberías y salones que quieren verse profesionales
        </span>

        <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight text-[var(--color-paper)] sm:text-5xl md:text-6xl">
          El sistema operativo de tu barbería, no una hoja de cálculo con pasos extra.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-[var(--color-muted)] sm:text-lg">
          Reservas sin fricción para tus clientes, un panel real para tu equipo, y
          los números claros para ti. Todo en un solo lugar, con tu marca al frente.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register">
            <Button className="w-full px-6 py-3 text-base sm:w-auto">
              Registra tu barbería gratis
            </Button>
          </Link>
          <a href="#planes">
            <Button variant="secondary" className="w-full px-6 py-3 text-base sm:w-auto">
              Ver planes
            </Button>
          </a>
        </div>
      </div>

      {/* Mockup del producto construido con nuestros propios componentes —
          sin capturas de pantalla ni imágenes externas. */}
      <div className="relative mx-auto mt-16 max-w-2xl rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-4 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <p className="font-[family-name:var(--font-display)] text-sm text-[var(--color-paper)]">
            Agenda de hoy
          </p>
          <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">
            Elite Barber Shop
          </span>
        </div>
        <div className="mt-3 flex flex-col divide-y divide-[var(--color-border)]">
          {[
            { client: "Josué M.", detail: "Corte + barba con Ana", time: "10:00 AM", status: "CONFIRMED" },
            { client: "Ramón P.", detail: "Fade clásico con Luis", time: "11:30 AM", status: "PENDING" },
            { client: "Deivi R.", detail: "Afeitado tradicional con Ana", time: "1:00 PM", status: "COMPLETED" },
          ].map((row) => (
            <div key={row.client} className="flex items-center justify-between py-3">
              <div className="text-left">
                <p className="text-sm text-[var(--color-paper)]">{row.client}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {row.time} · {row.detail}
                </p>
              </div>
              <Badge status={row.status} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
