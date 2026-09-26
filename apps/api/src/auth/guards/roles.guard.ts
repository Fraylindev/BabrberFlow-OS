import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Debe usarse SIEMPRE después del guard de autenticación aplicable, ya que
 * depende de que req.user ya esté poblado con el rol local vigente.
 *
 * Si un endpoint no tiene @Roles(...), este guard lo deja pasar sin
 * restricción adicional — solo actúa cuando hay roles explícitos definidos.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    return !!user?.role && requiredRoles.includes(user.role);
  }
}
