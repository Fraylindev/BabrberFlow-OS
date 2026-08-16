import { UnauthorizedException } from '@nestjs/common';
import type { ClerkBackendClient } from './clerk-auth.providers';
import type { ClerkAuthConfig } from './clerk-auth.config';
import type {
  ClerkConfigLoader,
  ClerkClientFactory,
} from './clerk-auth.providers';
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
      authorizedParties: ['http://localhost:3000', 'http://localhost:3001'],
      audience: ['kortek-api'],
    };

    // El servicio recibe un ClerkConfigLoader y un ClerkClientFactory.
    // En pruebas, el loader devuelve la config fija y el factory devuelve el mock.
    const configLoader: ClerkConfigLoader = () => config;
    const clientFactory: ClerkClientFactory = () => client;

    service = new ClerkSessionVerifierService(configLoader, clientFactory);
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
      authorizedParties: ['http://localhost:3000', 'http://localhost:3001'],
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

  it('falla cerrado cuando el cargador de configuración lanza al invocar verify()', async () => {
    // Simula el guard invocado sin variables Clerk en el entorno.
    // El loader lanza (como haría loadClerkAuthConfig sin CLERK_SECRET_KEY);
    // el servicio debe convertirlo en 401 genérico sin exponer el detalle.
    const failingLoader: ClerkConfigLoader = () => {
      throw new Error('CLERK_SECRET_KEY no está configurado para Clerk.');
    };
    const unusedFactory: ClerkClientFactory = () => {
      throw new Error('El factory no debería invocarse si el loader falla.');
    };

    const failingService = new ClerkSessionVerifierService(
      failingLoader,
      unusedFactory,
    );

    await expect(
      failingService.verify(new Request('http://localhost:3000/secure')),
    ).rejects.toMatchObject({
      message: 'Sesión no válida',
    });
  });

  it('reutiliza el cliente y la configuración ya inicializados en llamadas sucesivas', async () => {
    const request = new Request('http://localhost:3000/secure', {
      headers: { authorization: 'Bearer session-token-placeholder' },
    });

    // Invocamos verify() dos veces; el factory solo debe llamarse una vez.
    let factoryCallCount = 0;
    const client = {
      authenticateRequest,
      sessions: { getSession },
    } as unknown as ClerkBackendClient;
    const config: ClerkAuthConfig = {
      secretKey: 'test-secret-not-real',
      publishableKey: 'test-publishable-not-real',
      issuer,
      authorizedParties: ['http://localhost:3000'],
    };
    const countingFactory: ClerkClientFactory = () => {
      factoryCallCount++;
      return client;
    };

    const freshService = new ClerkSessionVerifierService(
      () => config,
      countingFactory,
    );

    await freshService.verify(request);
    await freshService.verify(request);

    expect(factoryCallCount).toBe(1);
    expect(freshService.getClient()).toBe(client);
  });
});
