import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Client } from "@/lib/api";
import { queryKeys } from "./keys";

const CLIENTS_PAGE_SIZE = 20;

export interface ClientListFilters {
  search?: string;
  isActive: boolean;
  page: number;
  limit?: number;
}

export interface ClientPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  metadataAvailable: boolean;
}

export interface ClientListResult {
  clients: Client[];
  pagination: ClientPagination;
}

function readPositiveHeader(
  headers: Headers,
  name: string,
): number | null {
  const rawValue = headers.get(name);
  if (rawValue === null) return null;
  const value = Number(rawValue);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function useClientsQuery() {
  return useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => api.get<Client[]>("/clients"),
  });
}

export function useClientsPageQuery(filters: ClientListFilters) {
  const limit = filters.limit ?? CLIENTS_PAGE_SIZE;
  const params: Record<string, string> = {
    isActive: String(filters.isActive),
    page: String(filters.page),
    limit: String(limit),
  };
  if (filters.search) params.search = filters.search;

  return useQuery({
    queryKey: [...queryKeys.clients.all, "page", filters],
    queryFn: async (): Promise<ClientListResult> => {
      const response = await api.getWithHeaders<Client[]>("/clients", params);
      const pageHeader = readPositiveHeader(response.headers, "X-Page");
      const limitHeader = readPositiveHeader(response.headers, "X-Limit");
      const totalHeader = readPositiveHeader(response.headers, "X-Total-Count");
      const totalPagesHeader = readPositiveHeader(
        response.headers,
        "X-Total-Pages",
      );
      const metadataAvailable = [
        pageHeader,
        limitHeader,
        totalHeader,
        totalPagesHeader,
      ].every((value) => value !== null);

      return {
        clients: response.data,
        pagination: {
          page: pageHeader ?? filters.page,
          limit: limitHeader ?? limit,
          total: totalHeader ?? response.data.length,
          totalPages: totalPagesHeader ?? 0,
          metadataAvailable,
        },
      };
    },
    placeholderData: (previous) => previous,
  });
}

export function useClientDetailQuery(id: string | null) {
  return useQuery({
    queryKey: [...queryKeys.clients.all, "detail", id],
    queryFn: () => api.get<Client>(`/clients/${id}`),
    enabled: Boolean(id),
  });
}

export interface ClientWriteInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export type CreateClientInput = ClientWriteInput;

export interface UpdateClientInput extends Partial<ClientWriteInput> {
  id: string;
}

function useInvalidateClients() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
}

export function useCreateClient() {
  const invalidateClients = useInvalidateClients();
  return useMutation({
    mutationFn: (input: CreateClientInput) => api.post<Client>("/clients", input),
    onSuccess: invalidateClients,
  });
}

export function useUpdateClient() {
  const invalidateClients = useInvalidateClients();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateClientInput) =>
      api.patch<Client>(`/clients/${id}`, input),
    onSuccess: invalidateClients,
  });
}

export function useArchiveClient() {
  const invalidateClients = useInvalidateClients();
  return useMutation({
    mutationFn: (id: string) => api.delete<Client>(`/clients/${id}`),
    onSuccess: invalidateClients,
  });
}

export function useRestoreClient() {
  const invalidateClients = useInvalidateClients();
  return useMutation({
    mutationFn: (id: string) => api.patch<Client>(`/clients/${id}/restore`),
    onSuccess: invalidateClients,
  });
}
