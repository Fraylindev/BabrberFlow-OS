import { ApiError } from './api.ts';
import { validBusinessDate } from './business-time.ts';
export type ScheduleState = 'UNCONFIRMED' | 'LEGACY_UNCONFIRMED' | 'CONFIRMED';
export interface ScheduleWindow {
  startTime: string;
  endTime: string;
}
export interface ScheduleDay {
  dayOfWeek: number;
  windows: ScheduleWindow[];
}
export interface ScheduleRegion {
  id: string;
  label: string;
}
export interface BusinessSchedule {
  revision: number;
  state: ScheduleState;
  zoneConfirmed: boolean;
  timeZone: string;
  region: ScheduleRegion | null;
  week: ScheduleDay[];
  activeClosureCount: number;
  management?: {
    legacyCategory: 'SQL_NULL' | 'JSON_NULL' | 'VALID' | 'INVALID' | null;
    ignoredLegacyKeys: string[];
    proposedLegacyWeek: ScheduleDay[] | null;
    zoneChangeAllowed: boolean;
    dependencies: {
      bookings: number;
      blocks: number;
      closures: number;
      promotions: number;
      emailIntents: number;
    };
  };
}
export interface ScheduleClosure {
  id: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'CANCELLED';
  reason?: string | null;
  cancelledAt?: string | null;
}
export interface SchedulePage<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}
export interface ScheduleImpact {
  revision: number;
  evaluatedAt: string;
  protectedBookingCount: number;
  conflictCount: number;
  conflicts: SchedulePage<{
    id: string;
    professionalId: string;
    startTime: string;
    endTime: string;
  }>;
  professionalEffects: SchedulePage<{
    professionalId: string;
    gainedMinutes: number;
    lostMinutes: number;
    basis: 'RECURRING_WEEK' | 'DATED_RULE_MINUTES';
  }> & { basis: 'RECURRING_WEEK' | 'DATED_RULE_MINUTES' };
}
export interface ClosureInput {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  reason?: string;
}
export type ScheduleCommand =
  | { kind: 'week'; body: { expectedRevision: number; week: ScheduleDay[] } }
  | { kind: 'closure'; body: ClosureInput & { expectedRevision: number } };
export const WEEKDAY_LABELS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];
export { formatBusinessClock as clockLabel } from './business-time.ts';
export function weekError(week: ScheduleDay[]): string | null {
  if (
    week.length !== 7 ||
    new Set(week.map((d) => d.dayOfWeek)).size !== 7 ||
    week.some(
      (d) =>
        !Number.isInteger(d.dayOfWeek) ||
        d.dayOfWeek < 0 ||
        d.dayOfWeek > 6 ||
        d.windows.length > 5,
    )
  )
    return 'Indica los siete días, con hasta cinco franjas por día.';
  for (const day of week) {
    let end = '';
    for (const w of [...day.windows].sort((a, b) => a.startTime.localeCompare(b.startTime))) {
      if (
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(w.startTime) ||
        !/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(w.endTime) ||
        w.startTime >= w.endTime ||
        (end && end > w.startTime)
      )
        return `Revisa las franjas de ${WEEKDAY_LABELS[day.dayOfWeek].toLowerCase()}: el final debe ser posterior y no pueden superponerse.`;
      end = w.endTime;
    }
  }
  return null;
}
export function closureError(input: ClosureInput): string | null {
  if (
    !validBusinessDate(input.startDate) ||
    !validBusinessDate(input.endDate) ||
    input.endDate > '9999-12-30' ||
    input.startDate > input.endDate
  )
    return 'Revisa las fechas del cierre.';
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.startTime) ||
    !/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(input.endTime) ||
    input.startTime >= input.endTime
  )
    return 'Revisa las horas del cierre.';
  if (
    input.startDate !== input.endDate &&
    (input.startTime !== '00:00' || input.endTime !== '24:00')
  )
    return 'Un cierre parcial debe empezar y terminar en la misma fecha.';
  if ((input.reason?.length ?? 0) > 500) return 'Usa hasta 500 caracteres para el motivo privado.';
  return null;
}
export function scheduleError(error: unknown): string {
  const message = scheduleErrorText(error);
  return error instanceof ApiError ? error.withRequestCode(message) : message;
}

function scheduleErrorText(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403)
      return 'Tu acceso cambió. Actualiza tu sesión para continuar.';
    if (error.status === 400)
      return 'Revisa las fechas y las horas. Si esa hora se repite o no existe, elige otra.';
    if (error.status === 404)
      return 'El horario o cierre ya no está disponible. Actualiza los datos.';
    if (error.status === 409)
      return 'El horario cambió o existen compromisos que impiden aplicar esta acción. Actualiza los datos y revisa el impacto antes de continuar.';
    if (error.status === 429) return 'Espera un momento antes de volver a intentarlo.';
  }
  return 'No pudimos completar la solicitud. Conservamos tu edición; revisa la conexión e intenta de nuevo.';
}
