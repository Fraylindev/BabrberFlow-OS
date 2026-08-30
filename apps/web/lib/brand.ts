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
 *
 * IMPORTANTE: `legalName` y `footer.copyright`/`footer.credit` deben
 * SIEMPRE referenciar `BRAND.name`/`BRAND.company` (getters), nunca
 * repetir el literal — esa es la única forma real de que "una sola
 * constante" siga siendo cierto si el nombre cambia mañana.
 */

export const BRAND = {
  name: "Kortek Booking",
  shortName: "Kortek",
  tagline: "El sistema operativo para barberías y salones modernos.",
  description:
    "Kortek Booking centraliza reservas, equipo, clientes y facturación interna de barberías y salones.",
  author: "Fraylin",
  company: "Kortek Studio",
  get legalName() {
    return this.name;
  },
  footer: {
    copyright: (year: number = new Date().getFullYear()) =>
      `© ${year} ${BRAND.name} · Una creación de ${BRAND.company}. Todos los derechos reservados.`,
    get credit() {
      return `Una creación de ${BRAND.company}`;
    },
  },
  colors: {
    accent: "#e11d2e",
  },
  // Canales configurados por el propietario; validar su titularidad antes de
  // un despliegue público definitivo.
  contact: {
    whatsapp: "https://wa.me/8297290386",
  },
  social: {
    facebook: "https://facebook.com/kortekbooking",
    instagram: "https://instagram.com/kortekbooking",
    tiktok: "https://tiktok.com/@kortekbooking",
  },
} as const;

export type Brand = typeof BRAND;
