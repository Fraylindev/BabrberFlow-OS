import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint (o controlador completo) a los roles indicados.
 * Debe usarse junto a JwtAuthGuard y RolesGuard:
 *
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(UserRole.OWNER, UserRole.ADMIN)
 *   @Post()
 *   create() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
