import type {
  ApiError,
  AuthUser,
  TeamDirectoryMember,
  UserRole,
} from "./api.ts";

export const TEAM_ROLE_OPTIONS: ReadonlyArray<{
  value: Exclude<UserRole, "OWNER">;
  label: string;
}> = [
  { value: "ADMIN", label: "Administrador" },
  { value: "BARBER", label: "Barbero" },
  { value: "RECEPTIONIST", label: "Recepción" },
];

export const TEAM_ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  BARBER: "Barbero",
  RECEPTIONIST: "Recepción",
};

export const PROFESSIONAL_STATUS_LABELS = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  ARCHIVED: "Archivado",
} as const;

export function teamScopeKey(
  user: Pick<AuthUser, "id" | "organizationId" | "role"> | null,
) {
  return user ? `${user.id}:${user.organizationId}:${user.role}` : null;
}

export function isCurrentTeamScope(
  currentScope: { key: string | null } | null,
  operationScope: { key: string | null },
) {
  return (
    currentScope !== null &&
    operationScope.key !== null &&
    currentScope === operationScope
  );
}

export function canManageTeam(role: UserRole | undefined) {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageTeamMember(
  actorRole: UserRole,
  memberRole: UserRole,
) {
  return actorRole === "OWNER" || (actorRole === "ADMIN" && memberRole !== "OWNER");
}

export function teamRoleInput(
  member: Pick<TeamDirectoryMember, "email">,
  role: Exclude<UserRole, "OWNER">,
) {
  return { email: member.email.trim().toLowerCase(), role };
}

export function teamRevokeInput(
  member: Pick<TeamDirectoryMember, "email">,
) {
  return { email: member.email.trim().toLowerCase() };
}

export type InvitationRevocationEvent<T extends { id: string }> =
  | { type: "OPEN"; invitation: T }
  | { type: "CANCEL" | "CLOSE" | "CONFIRM" };

export function invitationRevocationDecision<T extends { id: string }>(
  currentInvitation: T | null,
  event: InvitationRevocationEvent<T>,
) {
  if (event.type === "OPEN") {
    return { nextInvitation: event.invitation, revokeId: null };
  }

  if (event.type === "CONFIRM" && currentInvitation) {
    return {
      nextInvitation: currentInvitation,
      revokeId: currentInvitation.id,
    };
  }

  return { nextInvitation: null, revokeId: null };
}

export function teamErrorMessage(
  error: unknown,
  action: "members" | "invitations" | "invite" | "resend" | "revokeInvitation" | "role" | "revokeMember",
) {
  const status = (error as ApiError | undefined)?.status;
  if (status === 429) {
    return "Has realizado varias acciones seguidas. Espera un momento e intenta de nuevo.";
  }
  if (status === 403) return "No tienes permiso para administrar este equipo.";
  if (status === 404) return "Esta persona ya no está disponible en el equipo.";
  if (status === 409) {
    if (action === "role" || action === "revokeMember") {
      return "No pudimos aplicar el cambio. Confirma que la organización conserve al menos un propietario.";
    }
    return "La invitación cambió o ya existe otra activa. Actualiza la lista e intenta de nuevo.";
  }
  if (status === 503 && ["invite", "resend", "revokeInvitation"].includes(action)) {
    return "El servicio de invitaciones no está disponible ahora. Intenta de nuevo en unos minutos.";
  }
  if (action === "members") return "No pudimos cargar los miembros del equipo.";
  if (action === "invitations") return "No pudimos cargar las invitaciones.";
  if (action === "invite") return "No pudimos enviar la invitación.";
  if (action === "resend") return "No pudimos reenviar la invitación.";
  if (action === "revokeInvitation") return "No pudimos revocar la invitación.";
  if (action === "role") return "No pudimos cambiar el rol de esta persona.";
  return "No pudimos revocar el acceso de esta persona.";
}
