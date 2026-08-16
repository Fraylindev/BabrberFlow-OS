import { Prisma } from '@prisma/client';

/**
 * Detecta una violación de restricción única de Prisma (P2002) sin que
 * cada servicio tenga que repetir el chequeo de tipo. Uso:
 *
 *   try { ... } catch (err) {
 *     if (isUniqueConstraintError(err, 'email')) throw new ConflictException(...);
 *     throw err; // cualquier otro error sigue su curso normal
 *   }
 *
 * `field` es opcional — si se omite, solo confirma que ES un P2002
 * (cualquier campo). Si se pasa, confirma que el campo colisionado
 * coincide con `field` (Prisma expone los campos en error.meta.target).
 */
export function isSerializationFailureError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  );
}

export function isUniqueConstraintError(
  error: unknown,
  field?: string,
): boolean {
  const isP2002 =
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002';

  if (!isP2002) return false;
  if (!field) return true;

  const target = error.meta?.target;
  const targets = Array.isArray(target) ? target : [target];
  return targets.some((t) => typeof t === 'string' && t.includes(field));
}

/**
 * Detecta una violación de llave foránea al borrar (P2003) — ej. intentar
 * eliminar un Professional que todavía tiene Bookings asociados. Sin este
 * chequeo, Prisma deja pasar el error crudo de Postgres y NestJS lo
 * convierte en un 500 genérico.
 */
export function isForeignKeyConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2003'
  );
}

export function isRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

/**
 * Prisma can expose an unmapped PostgreSQL EXCLUDE violation as an unknown
 * request error (current engine) or P2004 (other engines/versions). Keep this
 * check specific to the schedule constraint so unrelated integrity errors are
 * never converted to HTTP 409.
 */
export function isBookingScheduleConflictError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return error.message.includes('Booking_professional_schedule_excl');
  }

  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2004'
  ) {
    return false;
  }

  const databaseError = error.meta?.database_error;
  return (
    typeof databaseError === 'string' &&
    databaseError.includes('Booking_professional_schedule_excl')
  );
}
