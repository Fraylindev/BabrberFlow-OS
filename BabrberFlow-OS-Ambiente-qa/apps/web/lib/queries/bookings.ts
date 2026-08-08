import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Booking, BookingStatus } from "@/lib/api";
import { queryKeys } from "./keys";

/**
 * GET /bookings — el backend ya filtra por rol (un BARBER solo ve su propia
 * agenda vía Professional.userId). No acepta filtros de rango de fecha
 * todavía: la vista de agenda Día/Semana (Fase 4) necesitará que el backend
 * exponga `?from=&to=&professionalId=`, señalado como pendiente en la
 * auditoría de Fase 0 — por ahora se filtra en cliente sobre este listado.
 */
export function useBookingsQuery() {
  return useQuery({
    queryKey: queryKeys.bookings.all,
    queryFn: () => api.get<Booking[]>("/bookings"),
  });
}

export interface CreateBookingInput {
  clientId: string;
  professionalId: string;
  serviceId: string;
  startTime: string;
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => api.post<Booking>("/bookings", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      api.patch<Booking>(`/bookings/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}
