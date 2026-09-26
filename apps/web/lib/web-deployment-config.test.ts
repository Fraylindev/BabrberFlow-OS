import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveWebApiBase, validateWebDeploymentConfig } from './web-deployment-config.ts';

const liveKey = `pk_live_${Buffer.from('clerk.booking.kortek.cloud$').toString('base64url')}`;
const testKey = `pk_test_${Buffer.from('example.clerk.accounts.dev$').toString('base64url')}`;
const valid: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  DEPLOY_ENV: 'production',
  WEB_PUBLIC_ORIGIN: 'https://booking.kortek.cloud',
  NEXT_PUBLIC_API_URL: 'https://api.booking.kortek.cloud',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: liveKey,
  CLERK_SECRET_KEY: 'sk_live_NON_SECRET_FIXTURE',
};
const phases = ['phase-production-build', 'phase-production-server'];

for (const phase of phases) {
  test(`accepts declared production configuration during ${phase}`, () => {
    assert.doesNotThrow(() => validateWebDeploymentConfig(phase, valid));
  });
  for (const variable of [
    'DEPLOY_ENV',
    'WEB_PUBLIC_ORIGIN',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ]) {
    test(`rejects missing ${variable} during ${phase}`, () => {
      assert.throws(
        () => validateWebDeploymentConfig(phase, { ...valid, [variable]: '' }),
        new RegExp(`variable=${variable}`),
      );
    });
  }
}

test('rejects local, insecure, wildcard and unexpected deployment origins', () => {
  for (const value of [
    'http://api.booking.kortek.cloud',
    'https://localhost:3000',
    'https://127.0.0.1',
    'https://[::1]',
    'https://*.kortek.cloud',
    'https://other.example.test',
    'https://api.booking.kortek.cloud/path',
    'https://api.booking.kortek.cloud/',
  ]) {
    assert.throws(
      () => validateWebDeploymentConfig(phases[0], { ...valid, NEXT_PUBLIC_API_URL: value }),
      /variable=NEXT_PUBLIC_API_URL/,
    );
  }
});
test('rejects development keys and mismatched production credentials without exposing values', () => {
  for (const override of [
    { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: testKey },
    { CLERK_SECRET_KEY: 'sk_test_NON_SECRET_FIXTURE' },
    { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_invalid' },
  ]) {
    assert.throws(
      () => validateWebDeploymentConfig(phases[1], { ...valid, ...override }),
      /WEB_CONFIG_INVALID variable=(?:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY|CLERK_SECRET_KEY)$/,
    );
  }
});
test('accepts explicit development artifacts only with local API and test keys', () => {
  const development = {
    ...valid,
    DEPLOY_ENV: 'development',
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3012',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: testKey,
    CLERK_SECRET_KEY: 'sk_test_NON_SECRET_FIXTURE',
  };
  for (const phase of phases)
    assert.doesNotThrow(() => validateWebDeploymentConfig(phase, development));
  assert.throws(
    () =>
      validateWebDeploymentConfig(phases[0], {
        ...development,
        NEXT_PUBLIC_API_URL: valid.NEXT_PUBLIC_API_URL,
      }),
    /variable=NEXT_PUBLIC_API_URL/,
  );
  assert.throws(
    () =>
      validateWebDeploymentConfig(phases[0], {
        ...development,
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: liveKey,
      }),
    /variable=NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/,
  );
});
test('validates staging against its separate declared origins', () => {
  const staging = {
    ...valid,
    DEPLOY_ENV: 'staging',
    WEB_PUBLIC_ORIGIN: 'https://staging.booking.kortek.cloud',
    NEXT_PUBLIC_API_URL: 'https://api.staging.booking.kortek.cloud',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: testKey,
    CLERK_SECRET_KEY: 'sk_test_NON_SECRET_FIXTURE',
  };
  assert.doesNotThrow(() => validateWebDeploymentConfig(phases[0], staging));
  assert.throws(
    () =>
      validateWebDeploymentConfig(phases[0], {
        ...staging,
        NEXT_PUBLIC_API_URL: valid.NEXT_PUBLIC_API_URL,
      }),
    /variable=NEXT_PUBLIC_API_URL/,
  );
});
test('keeps local dev fallback but refuses it in production code', () => {
  assert.equal(resolveWebApiBase(undefined, 'development'), 'http://localhost:3000');
  assert.throws(
    () => resolveWebApiBase(undefined, 'production'),
    /La aplicación no está configurada/,
  );
  assert.equal(
    resolveWebApiBase('https://api.booking.kortek.cloud/', 'production'),
    'https://api.booking.kortek.cloud',
  );
});
