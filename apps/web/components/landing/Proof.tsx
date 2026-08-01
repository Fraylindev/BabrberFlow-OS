import { Container } from "@/components/ui/Container";
import { Stat } from "@/components/ui/Stat";
import { Reveal } from "@/components/ui/Reveal";

export function Proof() {
  return (
    <section className="leather-grain relative overflow-hidden border-y border-[var(--color-border)] bg-[var(--color-surface)]/60 py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-[120px]"
        style={{ background: "var(--color-brass)" }}
      />
      <Container size="wide" className="relative">
        <Reveal>
          <p className="max-w-xl font-[family-name:var(--font-display)] text-2xl leading-snug text-[var(--color-paper)] sm:text-3xl">
            Construido para resolver lo que de verdad frena a una barbería —
            no una lista de funciones genéricas.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-4">
          <Reveal delay={0}>
            <Stat value="< 1 min" label="para que un cliente reserve" />
          </Reveal>
          <Reveal delay={60}>
            <Stat value="100%" label="datos aislados por negocio" />
          </Reveal>
          <Reveal delay={120}>
            <Stat value="4 roles" label="dueño, admin, recepción, barbero" />
          </Reveal>
          <Reveal delay={180}>
            <Stat value="0" label="hojas de cálculo necesarias" />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
