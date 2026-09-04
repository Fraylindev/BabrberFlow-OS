import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type TeamDirectoryMember,
  type TeamDirectoryPage,
  type TeamInvitation,
  type TeamInvitationPage,
  type TeamInvitationStatus,
  type UserRole,
} from "@/lib/api";
import { queryKeys } from "./keys";

export function useTeamMembersQuery(
  scopeKey: string,
  page: number,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.team.members(scopeKey, page),
    queryFn: () =>
      api.get<TeamDirectoryPage>("/organizations/mine/team-members", {
        page: String(page),
        limit: "20",
      }),
    enabled,
  });
}

export function useTeamInvitationsQuery({
  scopeKey,
  page,
  status,
  enabled,
}: {
  scopeKey: string;
  page: number;
  status?: TeamInvitationStatus;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.team.invitations(scopeKey, { page, status }),
    queryFn: () =>
      api.get<TeamInvitationPage>("/auth/clerk/invitations", {
        page: String(page),
        limit: "20",
        ...(status ? { status } : {}),
      }),
    enabled,
  });
}

function invalidateTeamScope(
  queryClient: ReturnType<typeof useQueryClient>,
  scopeKey: string,
) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.team.scope(scopeKey),
  });
}

export function useCreateTeamInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
    }: {
      scopeKey: string;
      input: {
        email: string;
        role: Exclude<UserRole, "OWNER">;
        createPublicProfile: boolean;
      };
    }) => api.post<TeamInvitation>("/auth/clerk/invitations", input),
    onSuccess: (_invitation, variables) =>
      invalidateTeamScope(queryClient, variables.scopeKey),
  });
}

export function useResendTeamInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; scopeKey: string }) =>
      api.post<TeamInvitation>(`/auth/clerk/invitations/${id}/resend`),
    onSuccess: (_invitation, variables) =>
      invalidateTeamScope(queryClient, variables.scopeKey),
  });
}

export function useRevokeTeamInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; scopeKey: string }) =>
      api.post<TeamInvitation>(`/auth/clerk/invitations/${id}/revoke`),
    onSuccess: (_invitation, variables) =>
      invalidateTeamScope(queryClient, variables.scopeKey),
  });
}

export function useUpdateTeamMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      email,
      role,
    }: {
      scopeKey: string;
      email: string;
      role: Exclude<UserRole, "OWNER">;
    }) =>
      api.patch<TeamDirectoryMember>("/organizations/mine/team-members/role", {
        email,
        role,
      }),
    onSuccess: (_member, variables) =>
      invalidateTeamScope(queryClient, variables.scopeKey),
  });
}

export function useRevokeTeamMemberAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email }: { scopeKey: string; email: string }) =>
      api.post<void>("/organizations/mine/team-members/revoke", { email }),
    onSuccess: (_result, variables) =>
      invalidateTeamScope(queryClient, variables.scopeKey),
  });
}
