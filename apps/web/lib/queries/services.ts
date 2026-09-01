import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Service } from "@/lib/api";
import { queryKeys } from "./keys";

export interface ServiceFilters {
  isActive?: boolean;
}

export interface ServiceWriteInput {
  name: string;
  description?: string;
  duration: number;
  price: number;
}

interface ScopedMutation<T> {
  scopeKey: string;
  input: T;
}

export function useServicesQuery(
  scopeKey: string | null = "shared-dashboard",
  filters: ServiceFilters = {},
) {
  return useQuery({
    queryKey: scopeKey ? queryKeys.services.list(scopeKey, filters) : queryKeys.services.all,
    queryFn: () =>
      api.get<Service[]>("/services", {
        ...(filters.isActive === undefined ? {} : { isActive: String(filters.isActive) }),
      }),
    enabled: Boolean(scopeKey),
  });
}

function invalidateScope(queryClient: ReturnType<typeof useQueryClient>, scopeKey: string) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.services.scope(scopeKey) });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input }: ScopedMutation<ServiceWriteInput>) =>
      api.post<Service>("/services", input),
    onSuccess: (_service, variables) => invalidateScope(queryClient, variables.scopeKey),
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: ScopedMutation<ServiceWriteInput> & { id: string }) =>
      api.patch<Service>(`/services/${id}`, input),
    onSuccess: (_service, variables) => invalidateScope(queryClient, variables.scopeKey),
  });
}

export function useDeactivateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; scopeKey: string }) =>
      api.delete<Service>(`/services/${id}`),
    onSuccess: (_service, variables) => invalidateScope(queryClient, variables.scopeKey),
  });
}

export function useReactivateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; scopeKey: string }) =>
      api.patch<Service>(`/services/${id}/reactivate`, {}),
    onSuccess: (_service, variables) => invalidateScope(queryClient, variables.scopeKey),
  });
}
