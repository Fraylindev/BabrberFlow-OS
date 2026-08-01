import { SectionHeading } from "./Section";

const PRINCIPLES = [
  {
    title: "Respeto por el oficio",
    description:
      "Un barbero de pie ocho horas no necesita una herramienta que le pida diez pasos para agendar un corte. Necesita una que desaparezca.",
  },
  {
    title: "Cero comisión por cita",
    description:
      "Tu cliente ya te paga a ti. No vamos a cobrarte otra vez por cada silla que ocupas.",
  },
  {
    title: "Tus datos son tuyos",
    description:
      "Aislamiento real entre negocios desde el diseño de la base de datos, no una promesa de marketing.",
  },
];

export function FoundersManifesto() {
  return (
    <section id="manifiesto" className="px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="El manifiesto" title="Por qué construimos Kortek Booking" />

      <div className="mx-auto mt-10 max-w-2xl text-center">
        <p className="font-[family-name:var(--font-display)] text-xl leading-relaxed text-[var(--color-paper)] sm:text-2xl">
          Las barberías mueven cuero, acero y horas de pie — no hojas de cálculo.
          Construimos Kortek Booking para que la tecnología se quede en segundo plano
          y el oficio vuelva a ser lo único que importa en la silla.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="border-t-2 border-[var(--color-brass)] pt-4">
            <h3 className="font-[family-name:var(--font-display)] text-base text-[var(--color-paper)]">
              {p.title}
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{p.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
