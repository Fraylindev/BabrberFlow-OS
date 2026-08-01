import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Client } from "@/lib/api";
import { queryKeys } from "./keys";

export function useClientsQuery() {
  return useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => api.get<Client[]>("/clients"),
  });
}

export interface CreateClientInput {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) => api.post<Client>("/clients", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}
