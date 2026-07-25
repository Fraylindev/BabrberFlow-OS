import { UserRole } from '@prisma/client';

/**
 * Separación conceptual entre los dos universos de Kortek OS, aunque
 * ambos compartan el modelo `User`:
 *
 * - B2B_ROLES: personal interno de la barbería/salón. Tienen acceso al
 *   panel de gestión (/dashboard/*). Son OWNER, ADMIN, BARBER, RECEPTIONIST.
 * - B2C: clientes finales que reservan servicios. Un solo rol, CUSTOMER.
 *   Se crean exclusivamente desde el flujo público de reservas
 *   (POST /public/:slug/bookings), nunca desde /auth/invite ni /auth/register.
 *   No tienen ni deben tener acceso a ningún endpoint del panel interno.
 *
 * Todo endpoint que hoy protegemos solo con JwtAuthGuard (sin @Roles)
 * queda, sin querer, abierto a CUALQUIER usuario autenticado — incluido
 * un CUSTOMER. Por eso cada endpoint de uso interno debe declarar
 * explícitamente @Roles(...B2B_ROLES) además de RolesGuard.
 */
export const B2B_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.BARBER,
  UserRole.RECEPTIONIST,
];
