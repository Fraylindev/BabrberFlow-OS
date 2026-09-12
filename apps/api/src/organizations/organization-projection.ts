import { ForbiddenException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';

const MINIMUM = {
  id: true,
  name: true,
  slug: true,
  timeZone: true,
} as const satisfies Prisma.OrganizationSelect;
// Los cuatro roles solo requieren contexto operativo. Datos CMS tienen rutas propias.
export function organizationSelectForRole(role: UserRole) {
  switch (role) {
    case UserRole.OWNER:
      return MINIMUM;
    case UserRole.ADMIN:
      return MINIMUM;
    case UserRole.BARBER:
      return MINIMUM;
    case UserRole.RECEPTIONIST:
      return MINIMUM;
    default:
      throw new ForbiddenException('No tienes acceso a esta información.');
  }
}
