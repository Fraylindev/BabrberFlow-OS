import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Service } from "@/lib/api";
import { queryKeys } from "./keys";

export function useServicesQuery() {
  return useQuery({
    queryKey: queryKeys.services.all,
    queryFn: () => api.get<Service[]>("/services"),
  });
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  duration: number;
  price: number;
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServiceInput) => api.post<Service>("/services", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    },
  });
}
