import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EmailOptIn } from '@/lib/notification-ui';
import {
  api,
  ApiError,
  PublicAvailabilityResponse,
  PublicBookingData,
  PublicBookingResult,
} from "@/lib/api";

export function publicReadMayRefresh(error: unknown, updatedAt: number) {
  return !(error instanceof ApiError && error.status === 429 && Date.now() < updatedAt + Math.max(1, error.retryAfterSeconds ?? 60) * 1000);
}

export function publicBookingKeys(slug: string, visit = 'page') {
  return {
    data: ["public-booking", slug, "data", visit] as const,
    days: (serviceId: string, from: string, to: string, professionalId?: string) =>
      ['public-booking', slug, 'days', visit, serviceId, from, to, professionalId ?? 'any'] as const,
    availability: (serviceId: string, date: string, professionalId?: string) =>
      [
        "public-booking",
        slug,
        "availability",
        visit,
        serviceId,
        date,
        professionalId ?? "any",
      ] as const,
  };
}

export function usePublicBookingData(slug: string, visit?: string) {
  return useQuery({
    queryKey: publicBookingKeys(slug, visit).data,
    queryFn: ({ signal }) => api.get<PublicBookingData>(`/public/${encodeURIComponent(slug)}/booking-data`, undefined, { signal, cache: 'no-store' }),
    retry: false,
    gcTime: 0,
    refetchInterval: false,
    // C3: publicación/retiro debe comprobarse incluso dentro de la ventana
    // de frescura cuando el visitante regresa a esta pestaña.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: query => publicReadMayRefresh(query.state.error, query.state.errorUpdatedAt) ? 'always' : false,
  });
}

interface AvailabilityParams {
  serviceId: string;
  date: string;
  professionalId?: string;
}

export function useAvailability(slug: string, params: AvailabilityParams, visit?: string) {
  const { serviceId, date, professionalId } = params;
  return useQuery({
    queryKey: publicBookingKeys(slug, visit).availability(serviceId, date, professionalId),
    queryFn: ({ signal }) => {
      const search = new URLSearchParams({ serviceId, date });
      if (professionalId) search.set("professionalId", professionalId);
      return api.get<PublicAvailabilityResponse>(
        `/public/${encodeURIComponent(slug)}/availability?${search.toString()}`, undefined, { signal, cache: 'no-store' },
      );
    },
    enabled: Boolean(serviceId && date),
    // La disponibilidad puede cambiar en cuanto alguien más reserva —
    // ventana de frescura corta, no cero, para no golpear el endpoint en
    // cada render mientras el cliente decide.
    staleTime: 15 * 1000,
    retry: false,
    gcTime: 0,
    refetchInterval: false,
    refetchOnWindowFocus: query => publicReadMayRefresh(query.state.error, query.state.errorUpdatedAt) ? 'always' : false,
  });
}

export interface PublicAvailabilityDays { from: string; to: string; serviceId: string; availableDates: string[] }
export function useAvailabilityDays(slug: string, params: Omit<AvailabilityParams, 'date'> & { from: string; to: string }, visit?: string, enabled = true) {
  const { serviceId, professionalId, from, to } = params;
  return useQuery({
    queryKey: publicBookingKeys(slug, visit).days(serviceId, from, to, professionalId),
    queryFn: ({ signal }) => {
      const search = new URLSearchParams({ serviceId, from, to });
      if (professionalId) search.set('professionalId', professionalId);
      return api.get<PublicAvailabilityDays>(`/public/${encodeURIComponent(slug)}/availability-days?${search}`, undefined, { signal, cache: 'no-store' });
    },
    enabled: enabled && Boolean(serviceId && from && to && from <= to), retry: false, gcTime: 0, refetchInterval: false,
    staleTime: 15_000, refetchOnWindowFocus: query => publicReadMayRefresh(query.state.error, query.state.errorUpdatedAt) ? 'always' : false,
  });
}

export interface CreatePublicBookingInput {
  serviceId: string;
  professionalId: string;
  startTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  emailNotifications?: EmailOptIn;
}

export function useCreatePublicBooking(slug: string, signal?: AbortSignal) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePublicBookingInput) =>
      api.post<PublicBookingResult>(`/public/${encodeURIComponent(slug)}/bookings`, input, { signal }),
    retry: false,
    gcTime: 0,
    onSuccess: () => {
      // Invalida toda la disponibilidad de esta barbería — la cita recién
      // creada debe desaparecer de cualquier grilla que se vuelva a abrir.
      queryClient.invalidateQueries({ queryKey: ["public-booking", slug, "availability"] });
      queryClient.invalidateQueries({ queryKey: ['public-booking', slug, 'days'] });
    },
  });
}
