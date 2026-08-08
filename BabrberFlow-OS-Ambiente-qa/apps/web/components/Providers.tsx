"use client";

import { ReactNode, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/lib/auth-context";

/**
 * Único punto de composición de providers globales. AuthProvider vive
 * dentro de ToastProvider porque login/registerOrganization pueden usar
 * useToast en el futuro; QueryClientProvider envuelve a ambos porque
 * cualquier hook de datos (useBookings, useServices...) necesita el
 * cliente disponible más arriba en el árbol que cualquier componente que
 * lo consuma.
 */
export function Providers({ children }: { children: ReactNode }) {
  // useState (no una constante de módulo) para que el QueryClient no se
  // comparta entre requests distintos durante el renderizado en servidor.
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
