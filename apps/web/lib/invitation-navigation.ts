import { AUTH_ROUTES } from "./auth-routes.ts";

export const INVITATION_QUERY_PARAM = "invitation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function invitationIdFromSearchParams(
  searchParams: Pick<URLSearchParams, "getAll">,
): string | null {
  const invitationIds = searchParams.getAll(INVITATION_QUERY_PARAM);
  if (invitationIds.length !== 1) return null;

  const [invitationId] = invitationIds;
  return invitationId && UUID_PATTERN.test(invitationId)
    ? invitationId
    : null;
}

function withInvitation(path: string, invitationId: string): string {
  const searchParams = new URLSearchParams({
    [INVITATION_QUERY_PARAM]: invitationId,
  });
  return `${path}?${searchParams.toString()}`;
}

export function acceptInvitationUrl(invitationId: string): string {
  return withInvitation(AUTH_ROUTES.acceptInvitation, invitationId);
}

export function invitationLoginUrl(invitationId: string): string {
  return withInvitation(AUTH_ROUTES.invitationLogin, invitationId);
}

export function invitationCompleteUrl(invitationId: string): string {
  return withInvitation(AUTH_ROUTES.invitationComplete, invitationId);
}
