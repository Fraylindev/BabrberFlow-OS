import { SectionHeading } from "./Section";

const MODULES = [
  { name: "Reservas", description: "Agenda con control de choques de horario en tiempo real." },
  { name: "Equipo", description: "Roles por persona: dueño, administrador, recepción, profesional." },
  { name: "Servicios", description: "Tu catálogo, tus precios, tus duraciones." },
  { name: "Clientes", description: "Historial y datos de contacto de cada cliente." },
  { name: "Facturación", description: "Genera y cobra facturas directo desde una cita completada." },
  { name: "Reserva pública", description: "Página propia por barbería, sin fricción, con WhatsApp integrado." },
];

export function Modules() {
  return (
    <section id="modulos" className="px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Qué incluye"
        title="Un módulo para cada parte del negocio"
        description="Nada que instalar por separado — todo conectado desde el primer día."
      />
      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <div
            key={m.name}
            className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <p className="font-[family-name:var(--font-display)] text-base text-[var(--color-paper)]">
              {m.name}
            </p>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">{m.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
