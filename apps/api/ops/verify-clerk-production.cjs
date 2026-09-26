// Read-only provider check: prints instance metadata and aggregate counts.
const assert = require('node:assert/strict');
const { createClerkClient } = require('@clerk/backend');
const {
  issuerFromPublishableKey,
} = require('../dist/auth/clerk/clerk-auth.config');
let stage = 'inputs';

async function main() {
  const key = process.env.CLERK_SECRET_KEY?.trim();
  assert.ok(key?.startsWith('sk_live_'));
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY?.trim();
  assert.ok(publishableKey?.startsWith('pk_live_'));
  assert.equal(
    issuerFromPublishableKey(publishableKey),
    'https://clerk.booking.kortek.cloud',
  );
  const client = createClerkClient({ secretKey: key, publishableKey });
  stage = 'instance-request';
  const instance = await client.instance.get();
  stage = 'instance-binding';
  assert.equal(instance.id, 'ins_3JrrToaAqH6sYe2bFXr3TdVnc3L');
  assert.equal(instance.environmentType, 'production');
  stage = 'domain-and-count-request';
  const [domains, users] = await Promise.all([
    client.domains.list(),
    client.users.getCount(),
  ]);
  stage = 'domain-binding';
  const domain = domains.data.find(
    (item) => item.name === 'booking.kortek.cloud',
  );
  assert.ok(domain);
  assert.equal(domain.isSatellite, false);
  const frontend = new URL(
    domain.frontendApiUrl.startsWith('https://')
      ? domain.frontendApiUrl
      : `https://${domain.frontendApiUrl}`,
  );
  assert.equal(frontend.origin, issuerFromPublishableKey(publishableKey));
  assert.ok(Number.isInteger(users) && users >= 0);
  console.log(
    `CLERK_PRODUCTION_CREDENTIAL_OK instance=${instance.id} environment=production domain=booking.kortek.cloud users=${users}`,
  );
}

const deadline = setTimeout(() => {
  console.error('CLERK_PRODUCTION_CHECK_FAILED kind=Deadline');
  process.exit(1);
}, 45_000);
void main()
  .catch((error) => {
    const status =
      Number.isInteger(error?.status) &&
      error.status >= 100 &&
      error.status <= 599
        ? error.status
        : 'unavailable';
    const kind = [
      'ClerkAPIResponseError',
      'TypeError',
      'AssertionError',
      'Error',
    ].includes(error?.constructor?.name)
      ? error.constructor.name
      : 'UnknownError';
    console.error(
      `CLERK_PRODUCTION_CHECK_FAILED stage=${stage} status=${status} kind=${kind}`,
    );
    process.exitCode = 1;
  })
  .finally(() => clearTimeout(deadline));
