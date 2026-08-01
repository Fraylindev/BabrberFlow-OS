import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function CTASection() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-sm border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-14 text-center sm:px-12">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--color-paper)] sm:text-4xl">
          Tu agenda merece algo mejor que un cuaderno
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-[var(--color-muted)]">
          Regístrate en minutos. Sin tarjeta de crédito para empezar.
        </p>
        <Link href="/register" className="mt-8 inline-block">
          <Button className="px-6 py-3 text-base">Registra tu barbería gratis</Button>
        </Link>
      </div>
    </section>
  );
}
