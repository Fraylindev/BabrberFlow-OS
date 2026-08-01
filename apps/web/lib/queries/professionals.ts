import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Professional } from "@/lib/api";
import { queryKeys } from "./keys";

export function useProfessionalsQuery() {
  return useQuery({
    queryKey: queryKeys.professionals.all,
    queryFn: () => api.get<Professional[]>("/professionals"),
  });
}

export interface CreateProfessionalInput {
  name: string;
  bio?: string;
  phone?: string;
}

export function useCreateProfessional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProfessionalInput) =>
      api.post<Professional>("/professionals", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.professionals.all });
    },
  });
}
