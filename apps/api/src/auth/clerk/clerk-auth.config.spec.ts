import {
  issuerFromPublishableKey,
  loadClerkAuthConfig,
} from './clerk-auth.config';

function publishableKey(frontendApi: string): string {
  return `pk_test_${Buffer.from(`${frontendApi}$`).toString('base64url')}`;
}

describe('Clerk auth config', () => {
  it('deriva el issuer y normaliza orígenes y audiencia sin exponer secretos', () => {
    const key = publishableKey('example.clerk.accounts.dev');

    expect(
      loadClerkAuthConfig({
        CLERK_SECRET_KEY: 'test-secret-not-real',
        CLERK_PUBLISHABLE_KEY: key,
        CLERK_AUTHORIZED_PARTIES:
          'http://localhost:3000/, http://localhost:3001, http://localhost:3001',
        CLERK_JWT_AUDIENCE: 'kortek-api, kortek-api-secondary',
      }),
    ).toEqual({
      secretKey: 'test-secret-not-real',
      publishableKey: key,
      issuer: 'https://example.clerk.accounts.dev',
      authorizedParties: ['http://localhost:3000', 'http://localhost:3001'],
      audience: ['kortek-api', 'kortek-api-secondary'],
    });
  });

  it('permite el session token estándar de Clerk sin claim aud configurado', () => {
    const key = publishableKey('example.clerk.accounts.dev');

    expect(
      loadClerkAuthConfig({
        CLERK_SECRET_KEY: 'test-secret-not-real',
        CLERK_PUBLISHABLE_KEY: key,
        CLERK_AUTHORIZED_PARTIES: 'http://localhost:3000',
      }).audience,
    ).toBeUndefined();
  });

  it('acepta orígenes con puerto explícito como http://localhost:3001', () => {
    const key = publishableKey('example.clerk.accounts.dev');

    const config = loadClerkAuthConfig({
      CLERK_SECRET_KEY: 'test-secret-not-real',
      CLERK_PUBLISHABLE_KEY: key,
      CLERK_AUTHORIZED_PARTIES:
        'http://localhost:3001, https://app.example.test:8443',
    });

    expect(config.authorizedParties).toEqual([
      'http://localhost:3001',
      'https://app.example.test:8443',
    ]);
  });

  it('rechaza publishable keys y orígenes inválidos', () => {
    expect(() => issuerFromPublishableKey('not-a-clerk-key')).toThrow();
    expect(() =>
      issuerFromPublishableKey(publishableKey('example.com?spoofed=true')),
    ).toThrow();
    expect(() =>
      loadClerkAuthConfig({
        CLERK_SECRET_KEY: 'test-secret-not-real',
        CLERK_PUBLISHABLE_KEY: publishableKey('example.clerk.accounts.dev'),
        CLERK_AUTHORIZED_PARTIES: 'javascript:alert(1)',
      }),
    ).toThrow();
    expect(() =>
      loadClerkAuthConfig({
        CLERK_SECRET_KEY: 'test-secret-not-real',
        CLERK_PUBLISHABLE_KEY: publishableKey('example.clerk.accounts.dev'),
        CLERK_AUTHORIZED_PARTIES: 'https://app.example.test/not-an-origin',
      }),
    ).toThrow();
  });

  it('arranca sin variables Clerk: el cargador se define sin evaluar la configuración', () => {
    // Simula el patrón del provider: la factory retorna una función en lugar de
    // llamar directamente a loadClerkAuthConfig. Crear el cargador no consume
    // el entorno y no lanza aunque falten todas las variables Clerk.
    const emptyEnv: NodeJS.ProcessEnv = {};
    const makeLoader =
      (): (() => ReturnType<typeof loadClerkAuthConfig>) => () =>
        loadClerkAuthConfig(emptyEnv);

    // Crear la función cargadora no lanza (equivalente al arranque del módulo)
    const loader = makeLoader();
    expect(typeof loader).toBe('function');

    // Solo al invocarlo se evalúa la configuración y se lanza el error
    expect(() => loader()).toThrow();
  });

  it('falla al invocar el cargador cuando CLERK_AUTHORIZED_PARTIES está ausente', () => {
    const key = publishableKey('example.clerk.accounts.dev');

    expect(() =>
      loadClerkAuthConfig({
        CLERK_SECRET_KEY: 'test-secret-not-real',
        CLERK_PUBLISHABLE_KEY: key,
        // CLERK_AUTHORIZED_PARTIES ausente — debe lanzar al invocar, no al registrar
      }),
    ).toThrow('CLERK_AUTHORIZED_PARTIES');
  });

  it('falla al invocar el cargador cuando CLERK_SECRET_KEY está ausente', () => {
    const key = publishableKey('example.clerk.accounts.dev');

    expect(() =>
      loadClerkAuthConfig({
        CLERK_PUBLISHABLE_KEY: key,
        CLERK_AUTHORIZED_PARTIES: 'http://localhost:3000',
        // CLERK_SECRET_KEY ausente
      }),
    ).toThrow('CLERK_SECRET_KEY');
  });
});
