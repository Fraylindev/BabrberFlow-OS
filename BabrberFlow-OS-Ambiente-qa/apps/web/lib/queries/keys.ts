/**
 * Fábrica centralizada de query keys. Un solo lugar para saber qué
 * invalidar tras cada mutación — evita strings de key repetidos e
 * inconsistentes entre hooks.
 */
export const queryKeys = {
  bookings: {
    all: ["bookings"] as const,
  },
  clients: {
    all: ["clients"] as const,
  },
  professionals: {
    all: ["professionals"] as const,
  },
  services: {
    all: ["services"] as const,
  },
  invoices: {
    all: ["invoices"] as const,
  },
};
