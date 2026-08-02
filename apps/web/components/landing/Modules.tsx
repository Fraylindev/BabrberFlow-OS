import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "./Section";

const MODULES = [
  { name: "Reservas", description: "Agenda con control de choques de horario en tiempo real." },
  { name: "Equipo", description: "Roles por persona: dueño, administrador, recepción, profesional." },
  { name: "Servicios", description: "Tu catálogo, tus precios, tus duraciones." },
  { name: "Clientes", description: "Historial y datos de contacto de cada cliente." },
  { name: "Facturación", description: "Genera y cobra facturas directo desde una cita completada." },
  { name: "Reserva pública", description: "Página propia por barbería, sin fricción, con WhatsApp integrado." },
];

/**
 * Índice editorial tipo revista — deliberadamente distinto del bento de
 * `Benefits`, para que ninguna sección consecutiva se sienta igual
 * (regla de ritmo/alternancia de layouts).
 */
export function Modules() {
  return (
    <section id="modulos" className="py-20 sm:py-28">
      <Container size="wide">
        <SectionHeading
          eyebrow="Qué incluye"
          title="Un módulo para cada parte del negocio"
          description="Nada que instalar por separado, todo conectado desde el primer día."
        />

        <div className="mx-auto mt-14 max-w-4xl divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {MODULES.map((m, i) => (
            <Reveal key={m.name} delay={i * 60}>
              <div className="group flex flex-col gap-2 py-6 transition-colors duration-[var(--duration-base)] sm:flex-row sm:items-baseline sm:gap-8 sm:py-7">
                <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-faint)] transition-colors duration-[var(--duration-base)] group-hover:text-[var(--color-brass)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)] sm:w-56 sm:shrink-0 sm:text-3xl">
                  {m.name}
                </p>
                <p className="text-sm text-[var(--color-muted)] sm:text-base">{m.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
