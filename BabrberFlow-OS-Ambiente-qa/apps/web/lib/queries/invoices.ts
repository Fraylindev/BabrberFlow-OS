import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Invoice } from "@/lib/api";
import { queryKeys } from "./keys";

export function useInvoicesQuery() {
  return useQuery({
    queryKey: queryKeys.invoices.all,
    queryFn: () => api.get<Invoice[]>("/invoices"),
  });
}

export interface CreateInvoiceInput {
  bookingId: string;
  amount: number;
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => api.post<Invoice>("/invoices", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<Invoice>(`/invoices/${id}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}
