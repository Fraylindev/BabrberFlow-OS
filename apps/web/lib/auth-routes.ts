export const AUTH_ROUTES = {
  acceptInvitation: "/accept-invitation",
  dashboard: "/dashboard",
  invitationComplete: "/auth/invitation/complete",
  invitationLogin: "/invitation-login",
  login: "/login",
  register: "/register",
} as const;

export function resolveDashboardRedirect(requested: string | null): string {
  if (
    requested === AUTH_ROUTES.dashboard ||
    requested?.startsWith(`${AUTH_ROUTES.dashboard}/`)
  ) {
    return requested;
  }

  return AUTH_ROUTES.dashboard;
}
