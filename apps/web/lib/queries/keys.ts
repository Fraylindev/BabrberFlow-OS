/**
 * Fábrica centralizada de query keys. Un solo lugar para saber qué
 * invalidar tras cada mutación — evita strings de key repetidos e
 * inconsistentes entre hooks.
 */
import type { ServiceSort } from "../service-ui";

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
    list: (scopeKey: string, filters: { isActive?: boolean; sort?: ServiceSort }) =>
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
  team: {
    all: ["team"] as const,
    scope: (scopeKey: string) => ["team", scopeKey] as const,
    members: (scopeKey: string, page: number) =>
      ["team", scopeKey, "members", page] as const,
    invitations: (
      scopeKey: string,
      filters: { page: number; status?: string },
    ) => ["team", scopeKey, "invitations", filters] as const,
  },
};
