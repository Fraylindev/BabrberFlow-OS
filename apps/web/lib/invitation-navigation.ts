import { AUTH_ROUTES } from './auth-routes.ts';

export const INVITATION_QUERY_PARAM = 'invitation';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function invitationIdFromSearchParams(
  searchParams: Pick<URLSearchParams, 'getAll'>,
): string | null {
  const invitationIds = searchParams.getAll(INVITATION_QUERY_PARAM);
  if (invitationIds.length !== 1) return null;

  const [invitationId] = invitationIds;
  return invitationId && UUID_PATTERN.test(invitationId) ? invitationId : null;
}

/**
 * Keeps the first valid local locator when an auth widget rewrites the URL.
 * A null candidate must never erase an already captured invitation UUID.
 */
export function retainInvitationId(
  captured: string | null,
  candidate: string | null,
): string | null {
  return captured ?? candidate;
}

/**
 * The invitation can advance only after Clerk has a persisted name or the
 * explicit save operation completed. A draft typed into the form is not proof
 * that the profile was saved.
 */
export function invitationProfileNeedsName(
  clerkName: string | null | undefined,
  saveCompleted: boolean,
): boolean {
  return !clerkName?.trim() && !saveCompleted;
}

export interface InvitationAcceptanceIssue {
  message: string;
  retryable: boolean;
}

export function invitationAcceptanceIssue(
  status: number | null,
  retryAfterSeconds: number | null = null,
): InvitationAcceptanceIssue {
  if (status === 429) {
    return {
      message:
        retryAfterSeconds !== null
          ? `La invitación está temporalmente limitada. Intenta de nuevo en ${retryAfterSeconds} s.`
          : 'La invitación está temporalmente limitada. Intenta de nuevo cuando se habilite la acción.',
      retryable: true,
    };
  }
  if (status === 400) {
    return {
      message: 'Completa tu nombre para activar el acceso a la organización.',
      retryable: true,
    };
  }
  if (status === 503) {
    return {
      message:
        'No pudimos confirmar la invitación ahora. Revisa tu conexión y vuelve a intentarlo.',
      retryable: true,
    };
  }
  if (status === 401 || status === 403 || status === 409) {
    return {
      message:
        'Este enlace venció, fue reemplazado o se abrió con otra cuenta. Cierra la sesión y abre la invitación más reciente usando el mismo correo que la recibió.',
      retryable: false,
    };
  }
  return {
    message:
      'No pudimos confirmar tu acceso. Revisa tu conexión o abre de nuevo la invitación más reciente.',
    retryable: true,
  };
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
