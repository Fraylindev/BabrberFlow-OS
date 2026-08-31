import type { AuthUser } from './api.ts';

export interface ProfessionalProfileDraft {
  name: string;
  specialty: string;
  bio: string;
  avatar: string;
  phone: string;
  experienceYears: string;
}

// Lista explícita: no propagar IDs, permisos o datos administrativos al PATCH.
export function professionalProfileInput(draft: ProfessionalProfileDraft) {
  return {
    name: draft.name.trim(),
    specialty: draft.specialty.trim() || null,
    bio: draft.bio.trim() || null,
    avatar: draft.avatar.trim() || null,
    phone: draft.phone.trim() || null,
    experienceYears: draft.experienceYears.trim() === '' ? null : Number(draft.experienceYears),
  };
}

export function professionalsScopeKey(
  user: Pick<AuthUser, 'id' | 'role'> | null,
  organizationId: string | null | undefined,
): string | null {
  return user && organizationId ? `${user.id}:${organizationId}:${user.role}` : null;
}

export function isCurrentProfessionalsScope(
  currentScope: { key: string | null } | null,
  operationScope: { key: string | null },
): boolean {
  // Una nueva visita al mismo tenant es otro contexto, no revalida operaciones anteriores.
  return currentScope !== null && operationScope.key !== null && currentScope === operationScope;
}

export const PROFESSIONAL_BUSINESS_TIME_COPY = {
  badge: 'Hora del negocio',
  context: 'Las fechas y horas se muestran según el horario configurado para esta organización.',
  invalid: 'Ingresa fechas y horas válidas según la hora del negocio.',
  inputHelp: 'Introduce la fecha y la hora tal como aplican en el negocio.',
} as const;
