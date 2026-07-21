import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Debe usarse SIEMPRE después de JwtAuthGuard, ya que depende de que
 * req.user ya esté poblado (JwtStrategy.validate lo llena con el usuario
 * completo, incluyendo su role actual en base de datos).
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

    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = request.user as { role?: UserRole } | undefined;

    return !!user?.role && requiredRoles.includes(user.role);
  }
}
