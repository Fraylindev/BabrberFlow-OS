import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type TeamInvitation,
  type TeamInvitationPage,
  type TeamInvitationStatus,
  type UserRole,
} from "@/lib/api";
import { queryKeys } from "./keys";

export function useTeamInvitationsQuery({
  organizationId,
  page,
  status,
  enabled,
}: {
  organizationId?: string;
  page: number;
  status?: TeamInvitationStatus;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: [
      ...queryKeys.invitations.all,
      organizationId,
      page,
      status ?? "ALL",
    ],
    queryFn: () =>
      api.get<TeamInvitationPage>("/auth/clerk/invitations", {
        page: String(page),
        limit: "20",
        ...(status ? { status } : {}),
      }),
    enabled: enabled && Boolean(organizationId),
    placeholderData: (previous) => previous,
  });
}

function useInvalidateInvitations() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
}

export function useCreateTeamInvitation() {
  const invalidate = useInvalidateInvitations();
  return useMutation({
    mutationFn: (input: {
      email: string;
      role: Exclude<UserRole, "OWNER">;
      createPublicProfile: boolean;
    }) => api.post<TeamInvitation>("/auth/clerk/invitations", input),
    onSuccess: invalidate,
  });
}

export function useResendTeamInvitation() {
  const invalidate = useInvalidateInvitations();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<TeamInvitation>(`/auth/clerk/invitations/${id}/resend`),
    onSuccess: invalidate,
  });
}

export function useRevokeTeamInvitation() {
  const invalidate = useInvalidateInvitations();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<TeamInvitation>(`/auth/clerk/invitations/${id}/revoke`),
    onSuccess: invalidate,
  });
}
