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
        CORS_ALLOWED_ORIGINS:
          'http://localhost:3000/, http://localhost:3002, http://localhost:3002',
        CLERK_JWT_AUDIENCE: 'kortek-api, kortek-api-secondary',
      }),
    ).toEqual({
      secretKey: 'test-secret-not-real',
      publishableKey: key,
      issuer: 'https://example.clerk.accounts.dev',
      authorizedParties: ['http://localhost:3000', 'http://localhost:3002'],
      audience: ['kortek-api', 'kortek-api-secondary'],
    });
  });

  it('permite el session token estándar de Clerk sin claim aud configurado', () => {
    const key = publishableKey('example.clerk.accounts.dev');

    expect(
      loadClerkAuthConfig({
        CLERK_SECRET_KEY: 'test-secret-not-real',
        CLERK_PUBLISHABLE_KEY: key,
        CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
      }).audience,
    ).toBeUndefined();
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
        CORS_ALLOWED_ORIGINS: 'javascript:alert(1)',
      }),
    ).toThrow();
    expect(() =>
      loadClerkAuthConfig({
        CLERK_SECRET_KEY: 'test-secret-not-real',
        CLERK_PUBLISHABLE_KEY: publishableKey('example.clerk.accounts.dev'),
        CORS_ALLOWED_ORIGINS: 'https://app.example.test/not-an-origin',
      }),
    ).toThrow();
  });
});
