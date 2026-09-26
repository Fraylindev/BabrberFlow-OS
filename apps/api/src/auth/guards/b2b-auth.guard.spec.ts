import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedRequest } from '../types/authenticated-request';
import { B2bAuthGuard } from './b2b-auth.guard';
import type { ClerkAuthGuard } from './clerk-auth.guard';

const userId = '8ee8cc3d-39db-420c-95a2-19d50b2ce24f';
const organizationId = 'f28b2d63-79b6-43f3-8d5a-a24a4ba3fc82';

function request(authorization = 'Bearer legacy-token'): AuthenticatedRequest {
  return {
    headers: { authorization },
  } as unknown as AuthenticatedRequest;
}

function context(req: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('B2bAuthGuard', () => {
  const verifyAsync = jest.fn();
  const clerkCanActivate = jest.fn();
  const findMembership = jest.fn();
  const guard = new B2bAuthGuard(
    { verifyAsync } as unknown as JwtService,
    {
      db: { membership: { findUnique: findMembership } },
    } as unknown as PrismaService,
    { canActivate: clerkCanActivate } as unknown as ClerkAuthGuard,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    verifyAsync.mockResolvedValue({ sub: userId, organizationId });
    findMembership.mockResolvedValue({
      organizationId,
      role: UserRole.ADMIN,
      user: { id: userId, name: 'Admin QA', email: 'admin@example.test' },
    });
  });

  it('preserva JWT legacy válido y revalida Membership/rol local', async () => {
    const req = request();

    await expect(guard.canActivate(context(req))).resolves.toBe(true);

    expect(clerkCanActivate).not.toHaveBeenCalled();
    expect(findMembership).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_organizationId: { userId, organizationId } },
      }),
    );
    expect(req.user).toMatchObject({
      id: userId,
      organizationId,
      role: UserRole.ADMIN,
    });
  });

  it('delega una sesión no legacy al ClerkAuthGuard autoritativo', async () => {
    verifyAsync.mockRejectedValue(new Error('invalid legacy signature'));
    clerkCanActivate.mockResolvedValue(true);
    const ctx = context(request('Bearer clerk-session-token'));

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(clerkCanActivate).toHaveBeenCalledWith(ctx);
    expect(findMembership).not.toHaveBeenCalled();
  });

  it('delega ausencia o formato inválido de bearer a Clerk para fallo cerrado', async () => {
    clerkCanActivate.mockRejectedValue(
      new UnauthorizedException('Sesión no válida para esta organización'),
    );

    await expect(
      guard.canActivate(context(request('Basic not-accepted'))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('no reinterpreta como Clerk un JWT legacy firmado con payload inválido', async () => {
    verifyAsync.mockResolvedValue({ sub: 'not-a-uuid', organizationId });

    await expect(guard.canActivate(context(request()))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(clerkCanActivate).not.toHaveBeenCalled();
  });

  it('rechaza inmediatamente una Membership legacy eliminada', async () => {
    findMembership.mockResolvedValue(null);

    await expect(guard.canActivate(context(request()))).rejects.toMatchObject({
      message: 'Sesión no válida para esta organización',
    });
    expect(clerkCanActivate).not.toHaveBeenCalled();
  });
});
