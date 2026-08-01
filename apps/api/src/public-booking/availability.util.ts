/**
 * Utilidades puras para calcular disponibilidad de horarios. Sin acceso a
 * base de datos aquí a propósito — más fácil de razonar y probar.
 *
 * LIMITACIÓN CONOCIDA (documentada, no oculta): `Organization.businessHours`
 * existe en el schema de Prisma pero hoy no lo puebla ni lo lee ningún
 * endpoint todavía — no hay pantalla de configuración de horario de
 * negocio. Mientras esa funcionalidad no exista (Fase 4/5, "Gestión del
 * negocio"), se usa un horario por defecto fijo para todos los días de la
 * semana. En cuanto exista el endpoint de configuración, basta con que
 * `resolveBusinessHours` reciba el valor real en vez del default.
 */

export interface BusinessHoursWindow {
  openMinutes: number; // minutos desde medianoche, ej. 9:00 → 540
  closeMinutes: number;
}

export const DEFAULT_BUSINESS_HOURS: BusinessHoursWindow = {
  openMinutes: 9 * 60, // 09:00
  closeMinutes: 19 * 60, // 19:00
};

export const SLOT_STEP_MINUTES = 30;

function parseHHmm(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Intenta leer un horario válido desde el JSON crudo de
 * `Organization.businessHours`. Formato esperado (cuando exista):
 * `{ "open": "09:00", "close": "19:00" }`. Cualquier otra forma, o el
 * campo vacío (el caso real hoy), cae al horario por defecto.
 */
export function resolveBusinessHours(raw: unknown): BusinessHoursWindow {
  if (raw && typeof raw === 'object') {
    const candidate = raw as Record<string, unknown>;
    const open =
      typeof candidate.open === 'string' ? parseHHmm(candidate.open) : null;
    const close =
      typeof candidate.close === 'string' ? parseHHmm(candidate.close) : null;
    if (open !== null && close !== null && open < close) {
      return { openMinutes: open, closeMinutes: close };
    }
  }
  return DEFAULT_BUSINESS_HOURS;
}

function minutesToHHmm(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Genera todos los horarios candidatos de inicio (formato "HH:mm") en los
 * que un servicio de `durationMinutes` cabría completo dentro de la
 * ventana de horario de negocio, en pasos de `SLOT_STEP_MINUTES`.
 */
export function generateCandidateSlots(
  window: BusinessHoursWindow,
  durationMinutes: number,
): string[] {
  const slots: string[] = [];
  const lastPossibleStart = window.closeMinutes - durationMinutes;
  for (
    let start = window.openMinutes;
    start <= lastPossibleStart;
    start += SLOT_STEP_MINUTES
  ) {
    slots.push(minutesToHHmm(start));
  }
  return slots;
}

/** true si [aStart, aEnd) se solapa con [bStart, bEnd) */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}
