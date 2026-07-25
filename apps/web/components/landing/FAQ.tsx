import { SectionHeading } from "./Section";

const FAQS = [
  {
    q: "¿Necesito instalar algo?",
    a: "No. Kortek OS corre en el navegador, tanto para ti como para tus clientes. Nada que descargar.",
  },
  {
    q: "¿Mis clientes necesitan crear una cuenta para reservar?",
    a: "No es obligatorio — pueden reservar como invitados. Si quieren, pueden crear una cuenta para que su próxima reserva sea más rápida.",
  },
  {
    q: "¿Puedo tener varios profesionales con acceso al panel?",
    a: "Sí. Cada persona de tu equipo tiene su propio usuario y rol: dueño, administrador, recepción o profesional — cada uno ve solo lo que le corresponde.",
  },
  {
    q: "¿Puedo cambiar de plan más adelante?",
    a: "Sí, en cualquier momento. No hay contrato de permanencia.",
  },
  {
    q: "¿Mis datos se mezclan con los de otras barberías?",
    a: "No. Cada barbería tiene sus datos completamente aislados — es parte del diseño desde la base, no un ajuste extra.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="Preguntas frecuentes" title="Todo lo que quieres saber antes de empezar" />
      <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-3">
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="group rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 open:border-[var(--color-brass)]/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm text-[var(--color-paper)]">
              {item.q}
              <span className="ml-4 text-[var(--color-muted)] transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm text-[var(--color-muted)]">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
