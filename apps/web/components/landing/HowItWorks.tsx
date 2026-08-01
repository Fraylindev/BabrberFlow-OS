import { SectionHeading } from "./Section";

const STEPS = [
  {
    number: "01",
    title: "Comparte tu enlace",
    description:
      "Cada barbería tiene su propia página de reservas: un enlace que pones en WhatsApp, Instagram o tu vitrina.",
  },
  {
    number: "02",
    title: "Tu cliente reserva solo",
    description:
      "Elige servicio, barbero y horario disponible. El sistema oculta automáticamente lo que ya está ocupado.",
  },
  {
    number: "03",
    title: "Tu equipo confirma y trabaja",
    description:
      "La cita aparece al instante en la agenda del barbero correspondiente, sin choques y sin doble reserva.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Cómo funciona"
        title="Tres pasos, sin fricción para nadie"
      />
      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.number} className="text-left">
            <p className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-brass)]">
              {step.number}
            </p>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-paper)]">
              {step.title}
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
