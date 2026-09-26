// Exercises the compiled entry point; invalid configuration must exit before Nest.
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const path = require('node:path');
const assert = require('node:assert/strict');

const env = {
  ...process.env,
  NODE_ENV: 'production',
  DEPLOY_ENV: 'production',
  APP_RELEASE: '6c3caa0',
  HOST: '127.0.0.1',
  PORT: '3323',
  DATABASE_URL:
    'postgresql://kortek_runtime:NON_SECRET_FIXTURE@invalid.example.test/postgres?sslmode=require&sslaccept=strict',
  JWT_SECRET: randomBytes(32).toString('hex'),
  RATE_LIMIT_SECRET: randomBytes(32).toString('hex'),
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
  CLOUDINARY_CLOUD_NAME: 'unused',
  CLOUDINARY_API_KEY: 'unused',
  CLOUDINARY_API_SECRET: 'unused',
};
for (const [label, override] of [
  ['missing-production-node-mode', { NODE_ENV: '' }],
  ['production-in-development-mode', { NODE_ENV: 'development' }],
  ['production-in-test-mode', { NODE_ENV: 'test' }],
  [
    'staging-in-development-mode',
    { DEPLOY_ENV: 'staging', NODE_ENV: 'development' },
  ],
  ['missing-cors', { CORS_ALLOWED_ORIGINS: '' }],
  ['localhost-cors', { CORS_ALLOWED_ORIGINS: 'http://localhost:3000' }],
  ['wildcard-cors', { CORS_ALLOWED_ORIGINS: '*' }],
  ['padded-booking-closure', { PUBLIC_BOOKING_CLOSED: 'true ' }],
  ['padded-mfa', { REQUIRE_INTERNAL_MFA: 'true ' }],
  ['leading-space-mfa', { REQUIRE_INTERNAL_MFA: ' true' }],
  ['padded-email-enabled', { NOTIFICATIONS_EMAIL_ENABLED: 'true ' }],
  ['padded-email-domain', { NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED: 'true ' }],
  ['missing-rate-secret', { RATE_LIMIT_SECRET: '' }],
  ['missing-clerk-secret', { CLERK_SECRET_KEY: '' }],
  [
    'development-clerk-secret',
    { CLERK_SECRET_KEY: 'sk_test_NON_SECRET_FIXTURE' },
  ],
  [
    'development-clerk-publishable',
    { CLERK_PUBLISHABLE_KEY: 'pk_test_NON_SECRET_FIXTURE' },
  ],
  [
    'migrator-role',
    {
      DATABASE_URL: env.DATABASE_URL.replace(
        'kortek_runtime',
        'kortek_migrator',
      ),
    },
  ],
  [
    'administrative-role',
    { DATABASE_URL: env.DATABASE_URL.replace('kortek_runtime', 'postgres') },
  ],
  [
    'implicit-certificate-policy',
    { DATABASE_URL: env.DATABASE_URL.replace('&sslaccept=strict', '') },
  ],
  [
    'invalid-certificates',
    {
      DATABASE_URL: env.DATABASE_URL.replace(
        'sslaccept=strict',
        'sslaccept=accept_invalid_certs',
      ),
    },
  ],
  [
    'socket-override',
    { DATABASE_URL: `${env.DATABASE_URL}&host=/tmp/postgres` },
  ],
  [
    'duplicate-certificate-policy',
    { DATABASE_URL: `${env.DATABASE_URL}&sslaccept=accept_invalid_certs` },
  ],
  [
    'wrong-database-protocol',
    { DATABASE_URL: env.DATABASE_URL.replace('postgresql:', 'https:') },
  ],
]) {
  const result = spawnSync(process.execPath, ['dist/main.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...env, ...override },
    timeout: 15000,
    encoding: 'utf8',
  });
  assert.equal(result.status, 1, label);
  assert.match(result.stderr, /API_START_FAILED Error/, label);
  assert.doesNotMatch(
    `${result.stdout}\n${result.stderr}`,
    /Starting Nest application|Nest application successfully started/,
    label,
  );
  console.log(`PRODUCTION_FAIL_CLOSED_OK case=${label}`);
}
