import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../types/authenticated-request';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ClerkSessionVerifierService } from '../clerk/clerk-session-verifier.service';
import { ClerkAuthGuard, ORGANIZATION_ID_HEADER } from './clerk-auth.guard';

const organizationId = 'f28b2d63-79b6-43f3-8d5a-a24a4ba3fc82';
const localUser = {
  id: '8ee8cc3d-39db-420c-95a2-19d50b2ce24f',
  email: 'local@example.test',
  name: 'Local User',
};

function makeRequest(): AuthenticatedRequest {
  return {
    headers: {
      [ORGANIZATION_ID_HEADER]: organizationId,
      'x-user-id': 'browser-controlled-user',
      'x-role': UserRole.OWNER,
      authorization: 'Bearer session-token-placeholder',
    },
    method: 'GET',
    protocol: 'http',
    originalUrl: '/secure',
    url: '/secure',
    get: jest.fn().mockReturnValue('localhost:3000'),
  } as unknown as AuthenticatedRequest;
}

function makeContext(request: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('ClerkAuthGuard', () => {
  let verify: jest.Mock;
  let findUser: jest.Mock;
  let findMembership: jest.Mock;
  let guard: ClerkAuthGuard;

  beforeEach(() => {
    verify = jest.fn().mockResolvedValue({
      clerkUserId: 'user_clerk_123',
      sessionId: 'sess_clerk_123',
    });
    findUser = jest.fn().mockResolvedValue(localUser);
    findMembership = jest.fn().mockResolvedValue({
      organizationId,
      role: UserRole.BARBER,
    });

    const verifier = { verify } as unknown as ClerkSessionVerifierService;
    const prisma = {
      db: {
        user: { findUnique: findUser },
        membership: { findUnique: findMembership },
      },
    } as unknown as PrismaService;

    guard = new ClerkAuthGuard(verifier, prisma);
  });

  it('resuelve sub solo mediante clerkUserId y toma tenant/rol de Membership local', async () => {
    const request = makeRequest();

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(findUser).toHaveBeenCalledWith({
      where: { clerkUserId: 'user_clerk_123' },
      select: { id: true, email: true, name: true },
    });
    expect(findMembership).toHaveBeenCalledWith({
      where: {
        userId_organizationId: {
          userId: localUser.id,
          organizationId,
        },
      },
      select: { organizationId: true, role: true },
    });
    expect(request.user).toEqual({
      ...localUser,
      organizationId,
      role: UserRole.BARBER,
    });
  });

  it('rechaza un sub de Clerk sin User local enlazado', async () => {
    findUser.mockResolvedValue(null);

    await expect(
      guard.canActivate(makeContext(makeRequest())),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findMembership).not.toHaveBeenCalled();
  });

  it('rechaza un User enlazado sin Membership en la organización seleccionada', async () => {
    findMembership.mockResolvedValue(null);

    await expect(
      guard.canActivate(makeContext(makeRequest())),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refleja cambio de rol y baja local en la petición siguiente', async () => {
    findMembership
      .mockResolvedValueOnce({ organizationId, role: UserRole.BARBER })
      .mockResolvedValueOnce({ organizationId, role: UserRole.ADMIN })
      .mockResolvedValueOnce(null);

    const firstRequest = makeRequest();
    const secondRequest = makeRequest();

    await guard.canActivate(makeContext(firstRequest));
    await guard.canActivate(makeContext(secondRequest));

    expect(firstRequest.user.role).toBe(UserRole.BARBER);
    expect(secondRequest.user.role).toBe(UserRole.ADMIN);
    await expect(
      guard.canActivate(makeContext(makeRequest())),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un selector de organización ausente o que no sea UUID', async () => {
    const request = makeRequest();
    request.headers[ORGANIZATION_ID_HEADER] = 'not-a-uuid';

    await expect(
      guard.canActivate(makeContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });
});
