import { validateProductionConfig } from './production-config';

const valid: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  DEPLOY_ENV: 'production',
  APP_RELEASE: '6c3caa0',
  DATABASE_URL:
    'postgresql://kortek_runtime:placeholder@db.example.test:5432/kortek?sslmode=require&sslaccept=strict',
  HOST: '0.0.0.0',
  PORT: '3000',
  JWT_SECRET: 'x'.repeat(32),
  RATE_LIMIT_SECRET: 'y'.repeat(32),
  WEB_PUBLIC_ORIGIN: 'https://booking.kortek.cloud',
  API_PUBLIC_ORIGIN: 'https://api.booking.kortek.cloud',
  CORS_ALLOWED_ORIGINS: 'https://booking.kortek.cloud',
  CLERK_SECRET_KEY: 'sk_live_NON_SECRET_FIXTURE',
  CLERK_PUBLISHABLE_KEY: 'pk_live_NON_SECRET_FIXTURE',
  CLERK_AUTHORIZED_PARTIES: 'https://booking.kortek.cloud',
  CLERK_INVITATION_REDIRECT_URL:
    'https://booking.kortek.cloud/accept-invitation',
  PUBLIC_BOOKING_CLOSED: 'true',
  REQUIRE_INTERNAL_MFA: 'false',
  NOTIFICATIONS_EMAIL_ENABLED: 'false',
  NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED: 'false',
  CLOUDINARY_CLOUD_NAME: 'placeholder',
  CLOUDINARY_API_KEY: 'placeholder',
  CLOUDINARY_API_SECRET: 'placeholder',
};

describe('production startup gate', () => {
  it('accepts exact HTTPS origins and explicitly disabled MFA/email', () => {
    expect(() => validateProductionConfig(valid)).not.toThrow();
  });

  it.each([
    { NODE_ENV: undefined },
    { NODE_ENV: 'development' },
    { NODE_ENV: 'test' },
    { DEPLOY_ENV: 'staging', NODE_ENV: undefined },
    { DEPLOY_ENV: 'staging', NODE_ENV: 'development' },
  ])(
    'does not bypass the remote deployment gate via NODE_ENV %#',
    (override) => {
      expect(() => validateProductionConfig({ ...valid, ...override })).toThrow(
        'NODE_ENV must be production for staging or production',
      );
    },
  );

  it.each([
    'PUBLIC_BOOKING_CLOSED',
    'REQUIRE_INTERNAL_MFA',
    'NOTIFICATIONS_EMAIL_ENABLED',
    'NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED',
  ])(
    'rejects padded boolean %s before a consumer can interpret it as off',
    (name) => {
      for (const value of ['true ', ' true']) {
        expect(() =>
          validateProductionConfig({ ...valid, [name]: value }),
        ).toThrow(`Invalid production boolean: ${name}`);
      }
    },
  );

  it.each([
    { APP_RELEASE: undefined },
    { APP_RELEASE: 'unversioned' },
    { CORS_ALLOWED_ORIGINS: undefined },
    { CORS_ALLOWED_ORIGINS: 'http://localhost:3001' },
    { CORS_ALLOWED_ORIGINS: '*' },
    { CLERK_AUTHORIZED_PARTIES: 'https://other.example.test' },
    { RATE_LIMIT_SECRET: undefined },
    { CLERK_SECRET_KEY: 'sk_test_NON_SECRET_FIXTURE' },
    { CLERK_PUBLISHABLE_KEY: 'pk_test_NON_SECRET_FIXTURE' },
    { CLERK_SECRET_KEY: 'placeholder' },
    {
      DATABASE_URL: valid.DATABASE_URL?.replace(
        'kortek_runtime',
        'kortek_migrator',
      ),
    },
    { DATABASE_URL: valid.DATABASE_URL?.replace('kortek_runtime', 'postgres') },
    { DATABASE_URL: valid.DATABASE_URL?.replace('&sslaccept=strict', '') },
    {
      DATABASE_URL: valid.DATABASE_URL?.replace(
        'sslaccept=strict',
        'sslaccept=accept_invalid_certs',
      ),
    },
    { DATABASE_URL: `${valid.DATABASE_URL}&host=/tmp/postgres` },
    { DATABASE_URL: `${valid.DATABASE_URL}&sslaccept=accept_invalid_certs` },
    { DATABASE_URL: `${valid.DATABASE_URL}&sslmode=disable` },
    { DATABASE_URL: valid.DATABASE_URL?.replace('postgresql:', 'https:') },
    { DATABASE_URL: 'postgresql://runtime:placeholder@localhost:5432/kortek' },
  ])('fails closed for unsafe configuration %#', (override) => {
    expect(() => validateProductionConfig({ ...valid, ...override })).toThrow();
  });

  it('accepts the independent runtime through the Supabase session pooler', () => {
    expect(() =>
      validateProductionConfig({
        ...valid,
        DATABASE_URL:
          'postgresql://kortek_runtime.ilaoolpcrlmqkftirjog:placeholder@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require&sslaccept=strict&sslcert=prod-ca-2021.crt',
      }),
    ).not.toThrow();
  });

  it('allows an isolated development Clerk instance in staging', () => {
    expect(() =>
      validateProductionConfig({
        ...valid,
        DEPLOY_ENV: 'staging',
        CLERK_SECRET_KEY: 'sk_test_NON_SECRET_FIXTURE',
        CLERK_PUBLISHABLE_KEY: 'pk_test_NON_SECRET_FIXTURE',
      }),
    ).not.toThrow();
  });
});
