import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function createContext(role: UserRole | undefined): ExecutionContext {
  return {
    getHandler: () => ({}) as never,
    getClass: () => ({}) as never,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard — permisos', () => {
  it('deja pasar cualquier request cuando el endpoint no declara @Roles(...)', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext(UserRole.BARBER))).toBe(true);
  });

  it('permite el acceso cuando el rol del usuario está en la lista requerida', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([UserRole.OWNER, UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext(UserRole.OWNER))).toBe(true);
  });

  it('rechaza el acceso cuando el rol del usuario NO está en la lista requerida', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([UserRole.OWNER, UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    // Caso central de todo lo auditado en la Fase 2: BARBER nunca debe
    // colarse en un endpoint restringido a OWNER/ADMIN.
    expect(guard.canActivate(createContext(UserRole.BARBER))).toBe(false);
  });

  it('rechaza cuando no hay usuario en la request (debe correr después de JwtAuthGuard)', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.OWNER]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext(undefined))).toBe(false);
  });

  it('rechaza a CUSTOMER de cualquier endpoint restringido a roles B2B', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([
          UserRole.OWNER,
          UserRole.ADMIN,
          UserRole.BARBER,
          UserRole.RECEPTIONIST,
        ]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext(UserRole.CUSTOMER))).toBe(false);
  });
});
