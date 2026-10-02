import { ApiError, type PublicBookingResult } from './api.ts';
import { addBusinessDays, validBusinessDate } from './business-time.ts';

export const ACCOUNT_QA_NOTICE = 'Esta opción está en pruebas. Todavía no puedes consultar tus reservas ni reservar más rápido con una cuenta. Puedes continuar sin crearla.';
export const CONTACT_REJECTION = 'No pudimos registrar la reserva con esos datos. Revísalos o contacta al negocio.';
export const UNCERTAIN_BOOKING = 'No pudimos comprobar si la reserva se registró. Contacta al negocio antes de volver a intentarlo.';

export interface ContactDraft {
  clientName: string; clientPhone: string; clientEmail: string;
  createAccount: boolean; password: string; emailOptedIn: boolean;
}
export function contactErrors(draft: ContactDraft) {
  const errors: Partial<Record<'clientName' | 'clientPhone' | 'clientEmail' | 'password', string>> = {};
  if (!draft.clientName.trim()) errors.clientName = 'Escribe tu nombre.';
  else if (draft.clientName.trim().length > 120) errors.clientName = 'Usa un nombre de hasta 120 caracteres.';
  // Misma sintaxis internacional y normalización que Clients; no inferir país.
  const phone = draft.clientPhone.trim();
  const digits = phone.replace(/\D/g, '');
  if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15 || phone.length > 30)
    errors.clientPhone = 'Revisa el teléfono y su prefijo: debe tener entre 7 y 15 dígitos.';
  const email = draft.clientEmail.trim();
  if (draft.createAccount && !email) errors.clientEmail = 'Escribe un correo para crear la cuenta o desmarca esa opción.';
  else if (email && (email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email))) errors.clientEmail = 'Revisa el correo.';
  if (draft.createAccount && draft.password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  return errors;
}

export function calendarMonth(month: string, minimum: string) {
  const first = `${month}-01`;
  if (!validBusinessDate(first) || !validBusinessDate(minimum)) throw new RangeError('Fecha no válida');
  const value = new Date(`${first}T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  const next = value.getUTCFullYear() > 9999 ? null : value.toISOString().slice(0, 10);
  // C1 exige que el extremo exclusivo sea representable.
  const last = next ? addBusinessDays(next, -1)! : '9999-12-30';
  const dates: string[] = [];
  for (let date: string | null = first; date && date <= last; date = addBusinessDays(date, 1)) dates.push(date);
  return { dates, from: first < minimum ? minimum : first, to: last, offset: new Date(`${first}T12:00:00Z`).getUTCDay() };
}
export function adjacentMonth(month: string, direction: number): string | null {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + direction);
  return date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999 ? null : date.toISOString().slice(0, 7);
}
export function bookingFailure(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) return { kind: 'retired' as const, message: '' };
    if (error.status === 400 || error.status === 422) return { kind: 'contact' as const, message: CONTACT_REJECTION };
    if (error.status === 409) return { kind: 'slot' as const, message: 'Ese horario ya no está disponible. Elige otra hora.' };
    if (error.status === 429) return { kind: 'limited' as const, message: 'Has hecho varios intentos. Espera un momento antes de continuar.' };
  }
  return { kind: 'uncertain' as const, message: UNCERTAIN_BOOKING };
}
export function calendarWeek(start: string, minimum: string) {
  const from = start < minimum ? minimum : start;
  if (!validBusinessDate(from)) throw new RangeError('Fecha no válida');
  const dates: string[] = [];
  for (let index = 0; index < 7; index++) {
    const day = addBusinessDays(from, index);
    if (day && day <= '9999-12-30') dates.push(day);
  }
  return { from, to: dates.at(-1) ?? from, dates };
}
export type SlotPeriod = 'all' | 'morning' | 'afternoon' | 'night';
export function slotPeriod(time: string): Exclude<SlotPeriod, 'all'> {
  const hour = Number(time.slice(0, 2));
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'night';
}

const escapeCalendar = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
export function bookingCalendar(result: PublicBookingResult, serviceName: string, uid: string, now: Date) {
  const { startTime, endTime } = result.booking;
  if (!Number.isFinite(Date.parse(startTime)) || !Number.isFinite(Date.parse(endTime)) || Date.parse(endTime) <= Date.parse(startTime)) return null;
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kortek Booking//Cita pendiente//ES', 'BEGIN:VEVENT',
    `UID:${escapeCalendar(uid)}@calendario.local`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(new Date(startTime))}`, `DTEND:${stamp(new Date(endTime))}`,
    `SUMMARY:${escapeCalendar(`Cita pendiente · ${serviceName}`)}`, 'STATUS:TENTATIVE',
    'DESCRIPTION:Reserva pendiente de confirmación por el negocio', 'END:VEVENT', 'END:VCALENDAR'];
  // RFC 5545: plegar por octetos UTF-8, sin partir caracteres.
  return lines.map(line => {
    let folded = '', width = 0;
    for (const character of line) {
      const bytes = new TextEncoder().encode(character).length;
      if (width + bytes > 75) { folded += '\r\n '; width = 1; }
      folded += character; width += bytes;
    }
    return folded;
  }).join('\r\n') + '\r\n';
}
