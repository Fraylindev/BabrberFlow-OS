import { ApiError, type AuthUser } from './api.ts';

export const EMAIL_NOTICE_VERSION = 'booking-email-v1' as const;
export const EMAIL_NOTICE_TEXT = 'Quiero recibir por correo avisos sobre el registro, la confirmación, la cancelación, la reprogramación y el cierre de esta reserva. Puedo retirar esta preferencia a través del negocio. No incluye publicidad';
export interface EmailOptIn {
  optedIn: boolean;
  noticeVersion: typeof EMAIL_NOTICE_VERSION;
}
export interface EmailPreference extends Omit<EmailOptIn, 'noticeVersion'> {
  version: number;
  noticeVersion: string | null;
  recordedAt: string | null;
  source: string | null;
  contactReviewed: boolean;
}
export interface EmailPreferenceInput extends EmailOptIn {
  expectedVersion: number;
  reviewedEmail?: string;
}
export const EMAIL_EVENTS = {
  CREATED: 'Reserva registrada', CONFIRMED: 'Reserva confirmada',
  CANCELLED: 'Reserva cancelada', RESCHEDULED: 'Reserva reprogramada',
  COMPLETED: 'Reserva completada',
} as const;
export const EMAIL_STATES = {
  PENDING: 'Pendiente', PROCESSING: 'En preparación', RETRY: 'Esperando reintento',
  ACCEPTED: 'Aceptado por el proveedor', DELIVERED: 'Entregado', FAILED: 'Fallido',
  UNCERTAIN: 'Resultado incierto', OMITTED: 'Omitido', OBSOLETE: 'Ya no corresponde',
} as const;
export interface EmailHistoryRow {
  id: string;
  bookingId: string;
  event: keyof typeof EMAIL_EVENTS;
  channel: 'EMAIL';
  createdAt: string;
  status: keyof typeof EMAIL_STATES;
  attempts: number;
  reason: string | null;
  recipientMasked: '***@***' | null;
  canRetry: boolean;
}
export interface EmailHistoryPage {
  data: EmailHistoryRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
export function notificationScope(user: AuthUser | null): string | null {
  return user ? JSON.stringify([user.id, user.organizationId, user.role]) : null;
}
export const canReadBookingEmails = (role: string | undefined) =>
  role === 'OWNER' || role === 'ADMIN' || role === 'RECEPTIONIST';
export const canManageEmails = (role: string | undefined) => role === 'OWNER' || role === 'ADMIN';
export function notificationError(error: unknown, operation: 'read' | 'preference' | 'retry' = 'read'): string {
  const message = notificationErrorText(error, operation);
  return error instanceof ApiError ? error.withRequestCode(message) : message;
}

function notificationErrorText(error: unknown, operation: 'read' | 'preference' | 'retry' = 'read') {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión ya no está disponible. Vuelve a iniciar sesión.';
    if (error.status === 403) return 'No tienes permiso para realizar esta operación.';
    if (error.status === 404) return 'Este registro no está disponible.';
    if (error.status === 400) return 'Revisa los datos e inténtalo de nuevo.';
    if (error.status === 409) return operation === 'retry'
      ? 'Este aviso ya no admite reintento. Consulta su estado actualizado.'
      : 'La preferencia o el correo cambió. Consulta la preferencia y revisa el correo del cliente antes de guardar.';
  }
  return operation === 'read' ? 'No pudimos consultar los avisos. Inténtalo de nuevo.'
    : 'No pudimos comprobar el resultado. Consulta el estado antes de volver a intentarlo.';
}
export function notificationReason(reason: string | null): string | null {
  const reasons: Record<string, string> = {
    NO_CONSENT: 'Sin autorización para avisos por correo.',
    NO_VALID_EMAIL: 'No había un correo válido disponible.',
    CONTACT_NOT_REVIEWED: 'El contacto necesita revisión.',
    ABUSE_LIMIT: 'Se alcanzó el límite temporal de avisos.',
    EXPIRED: 'Finalizó el plazo para enviar este aviso.',
    PROVIDER_REJECTED: 'El proveedor rechazó el aviso.',
    UNKNOWN_RESULT: 'No se pudo confirmar el resultado del envío.',
    UNRESOLVED: 'El resultado requiere revisión.',
    CONFIGURATION: 'El servicio de correo necesita revisión.',
    BOOKING_CHANGED: 'La reserva cambió y este aviso dejó de corresponder.',
    PREFERENCE_CHANGED: 'La preferencia de correo cambió.',
    CONTACT_CHANGED: 'El contacto cambió y necesita una nueva revisión.',
    BUDGET_EXHAUSTED: 'Se alcanzó el máximo de intentos o terminó el plazo de envío.',
    PROVIDER_UNAVAILABLE: 'El servicio de correo no estaba disponible. Se volverá a comprobar dentro del plazo permitido.',
    INVALID_CONTENT: 'No se pudo preparar el aviso.',
    SEALED_PAYLOAD_UNAVAILABLE: 'Este aviso requiere revisión.',
  };
  return reason ? (reasons[reason] ?? 'Consulta el estado del aviso; no cambia el estado de la reserva.') : null;
}
export { formatBusinessInstant as formatNotificationDate } from './business-time.ts';
