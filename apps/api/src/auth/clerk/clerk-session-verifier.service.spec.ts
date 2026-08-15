import { UnauthorizedException } from '@nestjs/common';
import type { ClerkBackendClient } from './clerk-auth.providers';
import type { ClerkAuthConfig } from './clerk-auth.config';
import { ClerkSessionVerifierService } from './clerk-session-verifier.service';

const userId = 'user_clerk_123';
const sessionId = 'sess_clerk_123';
const issuer = 'https://example.clerk.accounts.dev';

function signedInState(overrides: Record<string, unknown> = {}) {
  return {
    isAuthenticated: true,
    status: 'signed-in',
    toAuth: () => ({
      isAuthenticated: true,
      userId,
      sessionId,
      sessionClaims: {
        sub: userId,
        sid: sessionId,
        iss: issuer,
        exp: Math.floor(Date.now() / 1000) + 60,
        ...overrides,
      },
    }),
  };
}

describe('ClerkSessionVerifierService', () => {
  let authenticateRequest: jest.Mock;
  let getSession: jest.Mock;
  let service: ClerkSessionVerifierService;

  beforeEach(() => {
    authenticateRequest = jest.fn().mockResolvedValue(signedInState());
    getSession = jest.fn().mockResolvedValue({
      id: sessionId,
      userId,
      status: 'active',
    });

    const client = {
      authenticateRequest,
      sessions: { getSession },
    } as unknown as ClerkBackendClient;
    const config: ClerkAuthConfig = {
      secretKey: 'test-secret-not-real',
      publishableKey: 'test-publishable-not-real',
      issuer,
      authorizedParties: ['http://localhost:3000', 'http://localhost:3002'],
      audience: ['kortek-api'],
    };

    service = new ClerkSessionVerifierService(client, config);
  });

  it('acepta una sesión firmada, vigente, del issuer esperado y activa en Clerk', async () => {
    const request = new Request('http://localhost:3000/secure', {
      headers: { authorization: 'Bearer session-token-placeholder' },
    });

    await expect(service.verify(request)).resolves.toEqual({
      clerkUserId: userId,
      sessionId,
    });
    expect(authenticateRequest).toHaveBeenCalledWith(request, {
      acceptsToken: 'session_token',
      authorizedParties: ['http://localhost:3000', 'http://localhost:3002'],
      audience: ['kortek-api'],
    });
    expect(getSession).toHaveBeenCalledWith(sessionId);
  });

  it.each([
    [
      'firma o token inválido',
      { isAuthenticated: false, status: 'signed-out' },
    ],
    ['token expirado', { isAuthenticated: false, status: 'signed-out' }],
    ['audiencia inválida', { isAuthenticated: false, status: 'signed-out' }],
    ['origen no autorizado', { isAuthenticated: false, status: 'signed-out' }],
  ])('rechaza una sesión con %s', async (_case, state) => {
    authenticateRequest.mockResolvedValue({
      ...state,
      toAuth: () => ({ isAuthenticated: false }),
    });

    await expect(
      service.verify(new Request('http://localhost:3000/secure')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('rechaza un issuer distinto aunque el estado simulado esté autenticado', async () => {
    authenticateRequest.mockResolvedValue(
      signedInState({ iss: 'https://other.clerk.accounts.dev' }),
    );

    await expect(
      service.verify(new Request('http://localhost:3000/secure')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(getSession).not.toHaveBeenCalled();
  });

  it.each(['revoked', 'expired', 'ended'])(
    'rechaza una sesión cuyo estado autoritativo es %s',
    async (status) => {
      getSession.mockResolvedValue({ id: sessionId, userId, status });

      await expect(
        service.verify(new Request('http://localhost:3000/secure')),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('rechaza si la sesión activa pertenece a otro usuario', async () => {
    getSession.mockResolvedValue({
      id: sessionId,
      userId: 'user_clerk_other',
      status: 'active',
    });

    await expect(
      service.verify(new Request('http://localhost:3000/secure')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('normaliza fallos del SDK sin revelar detalles internos', async () => {
    authenticateRequest.mockRejectedValue(new Error('sensitive SDK detail'));

    await expect(
      service.verify(new Request('http://localhost:3000/secure')),
    ).rejects.toMatchObject({
      message: 'Sesión no válida',
    });
  });
});
