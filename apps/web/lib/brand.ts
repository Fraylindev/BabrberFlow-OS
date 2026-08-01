/**
 * Identidad de producto centralizada. Todo texto/dato de marca (nombre,
 * copy, autor, colores de acento) vive únicamente aquí. Cambiar el
 * branding del producto en el futuro es editar este archivo — nada más.
 *
 * Kortek Studio (empresa) vs. Kortek Booking (este producto): Kortek
 * Studio tiene su propio landing corporativo en un repositorio aparte.
 * `BRAND` describe el producto — el SaaS que este repo construye — no
 * la empresa. `BRAND.company` es la única referencia a la empresa
 * matriz, usada exclusivamente para el crédito del footer.
 *
 * Los tokens de color base (fondo, superficies, bordes) siguen viviendo
 * en app/globals.css vía @theme, porque ahí es donde Tailwind v4 los
 * necesita para generar utilidades — brand.ts solo referencia el acento
 * principal para los lugares que lo necesitan fuera de clases CSS (ej.
 * theme-color de metadata, SVGs generados dinámicamente).
 */

export const BRAND = {
  name: "Kortek Booking",
  shortName: "Kortek",
  tagline: "El sistema operativo para barberías y salones modernos.",
  description:
    "Kortek Booking es la plataforma todo-en-uno para gestionar reservas, equipo, clientes y pagos de tu barbería o salón.",
  author: "Fraylin",
  company: "Kortek Studio",
  legalName: "Kortek Booking",
  footer: {
    copyright: (year: number = new Date().getFullYear()) =>
      `© ${year} Kortek Booking · Una creación de Kortek Studio. Todos los derechos reservados.`,
    credit: "Una creación de Kortek Studio",
  },
  colors: {
    accent: "#c89b4a",
  },
} as const;

export type Brand = typeof BRAND;
