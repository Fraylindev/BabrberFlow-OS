/**
 * Política de contraseñas centralizada — un solo lugar para cambiar el
 * mínimo exigido en toda la app (register, invite, reserva pública,
 * cambio de contraseña). Mismo principio que apps/web/lib/brand.ts.
 *
 * Regla de negocio (CTO): mínimo 8 caracteres, sin exigir símbolos,
 * mayúsculas ni números — se prioriza baja fricción comercial y se
 * confía en rate-limiting para mitigar fuerza bruta.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MIN_LENGTH_MESSAGE = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;
