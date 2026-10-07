import { UserRole } from '@prisma/client';

/**
 * Separación conceptual entre los dos universos de Kortek OS, aunque
 * ambos compartan el modelo `User`:
 *
 * - B2B_ROLES: personal interno de la barbería/salón. Tienen acceso al
 *   panel de gestión (/dashboard/*). Son OWNER, ADMIN, BARBER, RECEPTIONIST.
 * - CUSTOMER: valor histórico conservado por compatibilidad de persistencia.
 *   El flujo público es de invitado y no crea identidades ni membresías.
 *   No tienen ni deben tener acceso a ningún endpoint del panel interno.
 *
 * Los guards JWT rechazan Membership CUSTOMER histórica. Cada endpoint
 * interno sigue declarando los roles permitidos además de RolesGuard;
 * autenticarse no sustituye la autorización de la tarea.
 */
export const B2B_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.BARBER,
  UserRole.RECEPTIONIST,
];
