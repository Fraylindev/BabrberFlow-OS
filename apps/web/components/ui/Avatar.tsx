import Image from "next/image";

const sizes = {
  sm: { box: "h-8 w-8", text: "text-xs" },
  md: { box: "h-12 w-12", text: "text-sm" },
  lg: { box: "h-20 w-20", text: "text-xl" },
  xl: { box: "h-32 w-32", text: "text-3xl" },
} as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Avatar de profesional/miembro de equipo. Sin foto real todavía (Fase 2
 * decidirá la fuente — Cloudinary), muestra iniciales sobre un fondo de
 * latón apagado, coherente con la identidad del producto en vez de un
 * ícono de persona genérico.
 */
export function Avatar({
  name,
  src,
  size = "md",
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const { box, text } = sizes[size];

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border-strong)] bg-[var(--color-brass-dim)]/25 ${box} ${className}`}
    >
      {src ? (
        <Image src={src} alt={name} fill sizes="128px" className="object-cover" />
      ) : (
        <span className={`font-[family-name:var(--font-display)] font-semibold text-[var(--color-brass)] ${text}`}>
          {initials(name) || "?"}
        </span>
      )}
    </div>
  );
}
