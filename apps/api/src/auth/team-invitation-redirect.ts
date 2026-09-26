export const TEAM_INVITATION_QUERY_PARAM = 'invitation';

export function buildTeamInvitationRedirectUrl(
  configuredRedirectUrl: string,
  invitationId: string,
): string {
  const redirectUrl = new URL(configuredRedirectUrl);
  redirectUrl.searchParams.set(TEAM_INVITATION_QUERY_PARAM, invitationId);
  return redirectUrl.toString();
}
