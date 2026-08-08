import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  PublicAvailabilityResponse,
  PublicBookingData,
  PublicBookingResult,
} from "@/lib/api";

export function publicBookingKeys(slug: string) {
  return {
    data: ["public-booking", slug, "data"] as const,
    availability: (serviceId: string, date: string, professionalId?: string) =>
      [
        "public-booking",
        slug,
        "availability",
        serviceId,
        date,
        professionalId ?? "any",
      ] as const,
  };
}

export function usePublicBookingData(slug: string) {
  return useQuery({
    queryKey: publicBookingKeys(slug).data,
    queryFn: () => api.get<PublicBookingData>(`/public/${slug}/booking-data`),
    // Los servicios/profesionales de una barbería casi no cambian durante
    // una sesión de reserva — evita refetch en cada paso del wizard.
    staleTime: 60 * 1000,
  });
}

interface AvailabilityParams {
  serviceId: string;
  date: string;
  professionalId?: string;
}

export function useAvailability(slug: string, params: AvailabilityParams) {
  const { serviceId, date, professionalId } = params;
  return useQuery({
    queryKey: publicBookingKeys(slug).availability(serviceId, date, professionalId),
    queryFn: () => {
      const search = new URLSearchParams({ serviceId, date });
      if (professionalId) search.set("professionalId", professionalId);
      return api.get<PublicAvailabilityResponse>(
        `/public/${slug}/availability?${search.toString()}`,
      );
    },
    enabled: Boolean(serviceId && date),
    // La disponibilidad puede cambiar en cuanto alguien más reserva —
    // ventana de frescura corta, no cero, para no golpear el endpoint en
    // cada render mientras el cliente decide.
    staleTime: 15 * 1000,
  });
}

export interface CreatePublicBookingInput {
  serviceId: string;
  professionalId: string;
  startTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  createAccount?: boolean;
  password?: string;
}

export function useCreatePublicBooking(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePublicBookingInput) =>
      api.post<PublicBookingResult>(`/public/${slug}/bookings`, input),
    onSuccess: () => {
      // Invalida toda la disponibilidad de esta barbería — la cita recién
      // creada debe desaparecer de cualquier grilla que se vuelva a abrir.
      queryClient.invalidateQueries({ queryKey: ["public-booking", slug, "availability"] });
    },
  });
}
