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
