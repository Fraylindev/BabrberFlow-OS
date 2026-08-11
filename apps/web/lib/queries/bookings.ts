import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Booking, BookingFilters, BookingStatus, RescheduleBookingInput } from "@/lib/api";
import { queryKeys } from "./keys";

/**
 * GET /bookings?from=&to=&status= — filtros todos opcionales.
 * El backend ya filtra por rol (un BARBER solo ve su propia agenda
 * vía Professional.userId). Sin filtros, devuelve todo el historial.
 *
 * La query key incluye los filtros para que React Query cachee y
 * re-fetch correctamente cuando el usuario cambia el rango o estado.
 */
export function useBookingsQuery(filters?: BookingFilters) {
  return useQuery({
    queryKey: [...queryKeys.bookings.all, filters ?? {}],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filters?.from) params.from = filters.from;
      if (filters?.to) params.to = filters.to;
      if (filters?.status) params.status = filters.status;
      return api.get<Booking[]>("/bookings", Object.keys(params).length ? params : undefined);
    },
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

/**
 * PATCH /bookings/:id — reprogramar fecha/hora, profesional y/o servicio.
 * Todos los campos del body son opcionales (RescheduleBookingDto del backend).
 * Separado deliberadamente de useUpdateBookingStatus: son dos operaciones
 * de negocio distintas (cambio de estado vs. cambio de logística).
 */
export function useRescheduleBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: RescheduleBookingInput & { id: string }) =>
      api.patch<Booking>(`/bookings/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}
