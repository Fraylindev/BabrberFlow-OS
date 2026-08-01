import Image from "next/image";
import { SectionHeading } from "./Section";

/**
 * Curaduría editorial de Unsplash (licencia libre, sin Unsplash+): sillas,
 * herramientas y locales reales de barbería. Cero fotos de oficina, cero
 * imágenes generadas — tal como exige la excepción de contenido estático
 * de la landing en el documento maestro.
 */
const PROBLEMS = [
  {
    title: "La agenda vive en WhatsApp",
    description:
      "Un cliente escribe, otro llama, un tercero llega sin avisar. Nadie en el equipo ve lo mismo al mismo tiempo.",
    imageUrl:
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80&auto=format&fit=crop",
    imageAlt: "Silla de barbero de cuero negro junto a una pared de ladrillo",
  },
  {
    title: "Dos clientes, un mismo horario",
    description:
      "Sin nadie que controle los choques en tiempo real, tarde o temprano dos personas reclaman la misma silla a la misma hora.",
    imageUrl:
      "https://images.unsplash.com/photo-1621607512022-6aecc4fed814?w=800&q=80&auto=format&fit=crop",
    imageAlt: "Tijeras de barbero profesionales sobre la mesa de trabajo",
  },
  {
    title: "La silla vacía que nadie ve venir",
    description:
      "Un no-show a última hora es tiempo perdido que no vuelve — y sin datos, es imposible saber cuánto cuesta de verdad.",
    imageUrl:
      "https://images.unsplash.com/photo-1512690459411-b9245aed614b?w=800&q=80&auto=format&fit=crop",
    imageAlt: "Silla de barbero marrón vacía en un local",
  },
];

export function ProblemSection() {
  return (
    <section id="problema" className="px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="El caos diario"
        title="Lo que ya conoces si diriges una barbería"
        description="Ninguno de estos problemas es nuevo. Todos son evitables."
      />
      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
        {PROBLEMS.map((p) => (
          <figure
            key={p.title}
            className="border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <div className="relative h-48 w-full grayscale">
              <Image
                src={p.imageUrl}
                alt={p.imageAlt}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[var(--color-ink)]/30" />
            </div>
            <figcaption className="p-5">
              <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-paper)]">
                {p.title}
              </h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{p.description}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
