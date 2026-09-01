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
    scope: (scopeKey: string) => ["services", scopeKey] as const,
    list: (scopeKey: string, filters: { isActive?: boolean }) =>
      ["services", scopeKey, "list", filters] as const,
  },
  invoices: {
    all: ["invoices"] as const,
    scope: (scopeKey: string) => ["invoices", scopeKey] as const,
    list: (
      scopeKey: string,
      filters: {
        page: number;
        limit: number;
        state?: "ISSUED" | "PAID";
        from?: string;
        to?: string;
      },
    ) => ["invoices", scopeKey, "list", filters] as const,
  },
  organizations: {
    scope: (scopeKey: string) => ["organizations", scopeKey] as const,
  },
  invitations: {
    all: ["team-invitations"] as const,
  },
};
