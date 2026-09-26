export const AUTH_ROUTES = {
  acceptInvitation: '/accept-invitation',
  dashboard: '/dashboard',
  dashboardAccess: '/dashboard/access',
  dashboardSetup: '/dashboard/setup',
  invitationComplete: '/auth/invitation/complete',
  invitationLogin: '/invitation-login',
  login: '/login',
  register: '/register',
} as const;

export type DashboardAccessState = 'ONBOARDING_REQUIRED' | 'NO_ACCESS' | 'READY';

export function resolveDashboardAccessRedirect(
  state: DashboardAccessState | null,
  pathname: string,
): string | null {
  if (state === 'ONBOARDING_REQUIRED') return AUTH_ROUTES.dashboardSetup;
  if (state === 'NO_ACCESS') return AUTH_ROUTES.dashboardAccess;
  if (
    state === 'READY' &&
    (pathname === AUTH_ROUTES.dashboardSetup || pathname === AUTH_ROUTES.dashboardAccess)
  ) {
    return AUTH_ROUTES.dashboard;
  }
  return null;
}

export function resolveDashboardRedirect(requested: string | null): string {
  if (requested === AUTH_ROUTES.dashboard || requested?.startsWith(`${AUTH_ROUTES.dashboard}/`)) {
    return requested;
  }

  return AUTH_ROUTES.dashboard;
}
