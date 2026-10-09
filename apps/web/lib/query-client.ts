import { QueryClient } from "@tanstack/react-query";
import { isTransientQueryError, retryQuery } from './query-recovery';

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
        retry: retryQuery,
        // After a bounded burst, keep recovering reads while the view is open.
        // TanStack pauses offline requests and resumes on reconnect.
        refetchInterval: (query) => isTransientQueryError(query.state.error) ? 15_000 : false,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
