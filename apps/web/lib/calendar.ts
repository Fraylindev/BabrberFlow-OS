import { api, ApiError, type BookingStatus, type AuthUser } from './api.ts';
export {
  addBusinessDays,
  businessDate,
  businessWeek,
  formatBusinessTime,
  formatCalendarDate,
} from '../../api/src/common/business-time.presentation.ts';
export interface CalendarBooking {
  id: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  updatedAt: string;
  revision: string;
  client: { name: string };
  professional: { id: string; name: string };
  service: { id: string; name: string };
}
export interface CalendarPageData {
  timeZone: string;
  from: string;
  to: string;
  rangeStart: string;
  rangeEnd: string;
  generatedAt: string;
  items: CalendarBooking[];
  nextCursor: string | null;
}
export interface CalendarAvailability {
  bookingId: string;
  updatedAt: string;
  revision: string;
  timeZone: string;
}
export interface CalendarDays extends CalendarAvailability {
  from: string;
  to: string;
  availableDates: string[];
}
export interface CalendarSlots extends CalendarAvailability {
  date: string;
  slots: { startTime: string; endTime: string }[];
}
export interface CalendarCommand {
  startTime: string;
  expectedUpdatedAt: string;
  expectedRevision: string;
}
export const calendarApi = {
  page: (params: Record<string, string>, signal: AbortSignal) =>
    api.get<CalendarPageData>('/bookings/calendar', params, { signal, cache: 'no-store' }),
  detail: (id: string, signal: AbortSignal) =>
    api.get<CalendarBooking>('/bookings/' + id, undefined, { signal, cache: 'no-store' }),
  days: (id: string, from: string, to: string, signal: AbortSignal) =>
    api.get<CalendarDays>(
      '/bookings/' + id + '/reschedule-availability-days',
      { from, to },
      { signal, cache: 'no-store' },
    ),
  slots: (id: string, date: string, signal: AbortSignal) =>
    api.get<CalendarSlots>(
      '/bookings/' + id + '/reschedule-availability',
      { date },
      { signal, cache: 'no-store' },
    ),
  move: (id: string, body: CalendarCommand, signal: AbortSignal) =>
    api.patch<{ id: string; updatedAt: string; revision: string }>(
      '/bookings/' + id + '/reschedule',
      body,
      { signal, cache: 'no-store' },
    ),
};
export const calendarScope = (user: AuthUser) =>
  JSON.stringify([user.id, user.organizationId, user.role]);
export const canMoveCalendar = (role: string) => ['OWNER', 'ADMIN', 'RECEPTIONIST'].includes(role);
export const calendarStatus: Record<BookingStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No asistió',
};
export function calendarError(error: unknown) {
  if (!(error instanceof ApiError))
    return 'No pudimos conectar con la agenda. Revisa tu conexión y vuelve a cargar.';
  const messages: Record<number, string> = {
    400: 'Revisa la fecha y el horario elegidos.',
    401: 'Tu sesión ya no está disponible. Vuelve a iniciar sesión.',
    403: 'Tu acceso no permite esta acción. Consulta con la persona responsable del negocio.',
    404: 'Esta reserva ya no está disponible. Cierra el detalle y vuelve a cargar la agenda.',
    409: 'La agenda o la reserva cambió. Vuelve a cargar antes de elegir otro horario.',
    429: 'Has consultado varios horarios seguidos. Espera un momento para continuar.',
    503: 'No pudimos consultar el negocio. Vuelve a cargar cuando recuperes la conexión.',
  };
  return error.withRequestCode(
    messages[error.status] ??
      'No pudimos completar el cambio. Revisa la reserva antes de intentarlo de nuevo.',
  );
}

export function calendarRetryUntil(seconds: number) {
  return Date.now() + seconds * 1000;
}
