import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  Professional,
  ProfessionalManagement,
  ProfessionalOwnProfile,
  ProfessionalStatus,
  TeamMember,
} from "@/lib/api";
import { queryKeys } from "./keys";

const PROFESSIONALS_PAGE_SIZE = 20;

export interface ProfessionalListFilters {
  search?: string;
  status?: ProfessionalStatus;
  page: number;
  limit?: number;
  scope: string;
}

export interface ProfessionalListResult {
  professionals: Professional[] | ProfessionalManagement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    metadataAvailable: boolean;
  };
}

function readPositiveHeader(headers: Headers, name: string): number | null {
  const rawValue = headers.get(name);
  if (rawValue === null) return null;
  const value = Number(rawValue);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function useProfessionalsQuery() {
  return useQuery({
    queryKey: queryKeys.professionals.all,
    queryFn: () => api.get<Professional[]>("/professionals"),
  });
}

export function useProfessionalsPageQuery(filters: ProfessionalListFilters) {
  const limit = filters.limit ?? PROFESSIONALS_PAGE_SIZE;
  const params: Record<string, string> = {
    page: String(filters.page),
    limit: String(limit),
  };
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;

  return useQuery({
    queryKey: [...queryKeys.professionals.all, "page", filters],
    queryFn: async (): Promise<ProfessionalListResult> => {
      const response = await api.getWithHeaders<
        Professional[] | ProfessionalManagement[]
      >("/professionals", params);
      const page = readPositiveHeader(response.headers, "X-Page");
      const pageLimit = readPositiveHeader(response.headers, "X-Limit");
      const total = readPositiveHeader(response.headers, "X-Total-Count");
      const totalPages = readPositiveHeader(response.headers, "X-Total-Pages");
      const metadataAvailable = [page, pageLimit, total, totalPages].every(
        (value) => value !== null,
      );

      return {
        professionals: response.data,
        pagination: {
          page: page ?? filters.page,
          limit: pageLimit ?? limit,
          total: total ?? response.data.length,
          totalPages: totalPages ?? 0,
          metadataAvailable,
        },
      };
    },
    placeholderData: (previous) => previous,
  });
}

export function useProfessionalDetailQuery(
  id: string | null,
  organizationId?: string,
) {
  return useQuery({
    queryKey: [
      ...queryKeys.professionals.all,
      "detail",
      organizationId,
      id,
    ],
    queryFn: () => api.get<ProfessionalManagement>(`/professionals/${id}`),
    enabled: Boolean(id),
  });
}

export function useOwnProfessionalQuery(
  enabled: boolean,
  organizationId?: string,
  userId?: string,
) {
  return useQuery({
    queryKey: [
      ...queryKeys.professionals.all,
      "me",
      organizationId,
      userId,
    ],
    queryFn: () => api.get<ProfessionalOwnProfile>("/professionals/me"),
    enabled,
  });
}

export function useBarberMembersQuery(enabled: boolean, organizationId?: string) {
  return useQuery({
    queryKey: [
      ...queryKeys.professionals.all,
      "barber-members",
      organizationId,
    ],
    queryFn: async () => {
      const members = await api.get<TeamMember[]>("/organizations/mine/members");
      return members.filter((member) => member.role === "BARBER");
    },
    enabled,
  });
}

export interface CreateProfessionalInput {
  name: string;
  bio?: string | null;
  phone?: string | null;
  avatar?: string | null;
  specialty?: string | null;
  experienceYears?: number | null;
}

export interface UpdateProfessionalInput
  extends Partial<CreateProfessionalInput> {
  id: string;
}

export type UpdateOwnProfessionalInput = Partial<
  Omit<CreateProfessionalInput, "phone">
>;

function useInvalidateProfessionals() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.professionals.all });
}

export function useCreateProfessional() {
  const invalidateProfessionals = useInvalidateProfessionals();
  return useMutation({
    mutationFn: (input: CreateProfessionalInput) =>
      api.post<Professional>("/professionals", input),
    onSuccess: invalidateProfessionals,
  });
}

export function useUpdateProfessional() {
  const invalidateProfessionals = useInvalidateProfessionals();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateProfessionalInput) =>
      api.patch<ProfessionalManagement>(`/professionals/${id}`, input),
    onSuccess: invalidateProfessionals,
  });
}

export function useUpdateOwnProfessional() {
  const invalidateProfessionals = useInvalidateProfessionals();
  return useMutation({
    mutationFn: (input: UpdateOwnProfessionalInput) =>
      api.patch<ProfessionalOwnProfile>("/professionals/me", input),
    onSuccess: invalidateProfessionals,
  });
}

export function useUpdateProfessionalStatus() {
  const invalidateProfessionals = useInvalidateProfessionals();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      api.patch<ProfessionalManagement>(`/professionals/${id}/status`, {
        status,
      }),
    onSuccess: invalidateProfessionals,
  });
}

export function useUpdateProfessionalVisibility() {
  const invalidateProfessionals = useInvalidateProfessionals();
  return useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      api.patch<ProfessionalManagement>(`/professionals/${id}/visibility`, {
        isPublic,
      }),
    onSuccess: invalidateProfessionals,
  });
}

export function useArchiveProfessional() {
  const invalidateProfessionals = useInvalidateProfessionals();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<ProfessionalManagement>(`/professionals/${id}`),
    onSuccess: invalidateProfessionals,
  });
}

export function useRestoreProfessional() {
  const invalidateProfessionals = useInvalidateProfessionals();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<ProfessionalManagement>(`/professionals/${id}/restore`),
    onSuccess: invalidateProfessionals,
  });
}

export function useLinkProfessional() {
  const invalidateProfessionals = useInvalidateProfessionals();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      api.patch<ProfessionalManagement>(`/professionals/${id}/link`, {
        userId,
      }),
    onSuccess: invalidateProfessionals,
  });
}

export function useUnlinkProfessional() {
  const invalidateProfessionals = useInvalidateProfessionals();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<ProfessionalManagement>(`/professionals/${id}/link`),
    onSuccess: invalidateProfessionals,
  });
}
