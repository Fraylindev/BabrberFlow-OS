import { SectionHeading } from "./Section";

const FEATURES = [
  "Detección de choques de horario en tiempo real",
  "Roles y permisos por persona (dueño, admin, recepción, profesional)",
  "Aislamiento de datos real entre negocios (multi-tenant desde el diseño)",
  "Página de reservas propia por barbería, sin fricción",
  "Notificaciones inmediatas en cada acción del panel",
  "Facturación con estados claros: pendiente, pagada, reembolsada",
  "Protección contra spam en las reservas públicas",
  "Diseñado para usarse cómodo horas seguidas, no solo minutos",
];

export function Features() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Características"
        title="Construido con el detalle que un negocio real necesita"
      />
      <ul className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-[var(--color-muted)]">
            <span className="mt-0.5 text-[var(--color-brass)]">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
