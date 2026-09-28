import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between bg-[var(--color-ink)] px-4 py-10 text-[var(--color-paper)]">
      {/* Background glow & subtle grain */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-brass)]/10 blur-[100px]"
      />
      <div aria-hidden className="film-grain absolute inset-0 pointer-events-none" />

      {/* Brand Header */}
      <header className="relative z-10 w-full max-w-5xl">
        <Link href="/" className="inline-block">
          <Brand compact={false} />
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 my-auto text-center max-w-lg">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[var(--shadow-raised)]">
          <svg
            className="h-10 w-10 text-[var(--color-brass)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" />
            <line x1="14.47" y1="14.48" x2="20" y2="20" />
            <line x1="8.12" y1="8.12" x2="12" y2="12" />
          </svg>
        </div>

        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-brass)]">
          Error 404
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold sm:text-4xl text-[var(--color-paper)]">
          Esta página no está en la agenda
        </h1>
        <p className="mt-3 text-sm sm:text-base text-[var(--color-muted)] leading-relaxed">
          La dirección que buscas no existe o ha cambiado de lugar. Vuelve al inicio para explorar o entra a tu panel.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto px-6 py-2.5">
              Volver al inicio
            </Button>
          </Link>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto px-6 py-2.5">
              Ir al panel de control
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-[var(--color-faint)]">
        Kortek Booking · Sistema operativo para barberías
      </footer>
    </div>
  );
}
