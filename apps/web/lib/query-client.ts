import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

/**
 * Fábrica de QueryClient. Se crea una instancia nueva por render en el
 * servidor (evita compartir estado entre requests) y una única instancia
 * memoizada en el cliente (evita perder la caché en cada remount), tal como
 * recomienda la documentación oficial de TanStack Query para App Router.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Los datos de un SaaS de agenda cambian con frecuencia moderada
        // (otro usuario del mismo local puede crear/mover una cita) — 30s
        // de "fresh" evita refetch en cada click de UI sin volverse obsoleto.
        staleTime: 30 * 1000,
        // 401/403/404 no se resuelven reintentando la misma petición.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
