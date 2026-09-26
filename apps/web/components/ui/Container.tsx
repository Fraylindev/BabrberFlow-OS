import { ReactNode } from "react";

/**
 * Ancho máximo consistente en los 3 productos (landing, sitio público,
 * panel). Antes cada sección del landing repetía "mx-auto max-w-*
 * px-4 sm:px-6" a mano — centralizado acá para no volver a divergir
 * por accidente entre pantallas nuevas.
 */
export function Container({
  children,
  className = "",
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}) {
  const widths = {
    narrow: "max-w-3xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
  };

  return (
    <div className={`mx-auto ${widths[size]} px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}
