/**
 * Identidad de producto centralizada. Todo texto/dato de marca (nombre,
 * copy, autor, colores de acento) vive únicamente aquí. Cambiar el
 * branding del producto en el futuro es editar este archivo — nada más.
 *
 * Los tokens de color base (fondo, superficies, bordes) siguen viviendo
 * en app/globals.css vía @theme, porque ahí es donde Tailwind v4 los
 * necesita para generar utilidades — brand.ts solo referencia el acento
 * principal para los lugares que lo necesitan fuera de clases CSS (ej.
 * theme-color de metadata, SVGs generados dinámicamente).
 */

export const BRAND = {
  name: "Kortek OS",
  shortName: "Kortek",
  tagline: "El sistema operativo para barberías y salones modernos.",
  description:
    "Kortek OS es la plataforma todo-en-uno para gestionar reservas, equipo, clientes y pagos de tu barbería o salón.",
  author: "Fraylin",
  company: "Kortek",
  legalName: "Kortek OS",
  footer: {
    copyright: (year: number = new Date().getFullYear()) =>
      `© ${year} Kortek OS. Creado por Fraylin.`,
    credit: "Creado por Fraylin",
  },
  colors: {
    accent: "#c89b4a",
  },
} as const;

export type Brand = typeof BRAND;
