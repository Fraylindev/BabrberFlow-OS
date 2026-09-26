// C1 only: use the sole test identity's existing session, without onboarding.
// Credentials and tokens stay in memory; the API binds only to loopback.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { createClerkClient } = require('@clerk/backend');
const { TokenVerificationErrorReason } = require('@clerk/backend/errors');
const { parse } = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const {
  ClerkBootstrapService,
} = require('../dist/auth/clerk-bootstrap.service');
const {
  validateProductionConfig,
} = require('../dist/common/production-config');

const apiRoot = path.resolve(__dirname, '..');
const port = 3341;
const origin = `http://127.0.0.1:${port}`;
const c1Parties = ['https://booking.kortek.cloud'];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let child;
let stage = 'inputs';
let startupLog = '';
const deadline = setTimeout(() => {
  if (child && child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
  }
  console.error('CLERK_PRODUCTION_SESSION_CHECK_FAILED stage=deadline');
  process.exit(1);
}, 90_000);

async function request(route, headers = {}, method = 'GET') {
  return fetch(`${origin}${route}`, {
    method,
    headers,
    signal: AbortSignal.timeout(20_000),
    redirect: 'error',
  });
}

async function main() {
  assert.equal(process.env.C1_CLERK_SESSION_SMOKE, 'true');
  const database = new URL(process.env.DATABASE_URL);
  assert.equal(database.hostname, 'aws-0-us-east-1.pooler.supabase.com');
  assert.equal(database.username, 'kortek_runtime.ilaoolpcrlmqkftirjog');
  assert.equal(database.searchParams.get('sslaccept'), 'strict');
  assert.ok(process.env.CLERK_SECRET_KEY?.startsWith('sk_live_'));
  assert.ok(process.env.CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_'));
  const client = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });
  stage = 'instance';
  const instance = await client.instance.get();
  assert.equal(instance.id, 'ins_3JrrToaAqH6sYe2bFXr3TdVnc3L');
  assert.equal(instance.environmentType, 'production');
  stage = 'sole-test-identity';
  assert.equal(await client.users.getCount(), 1);
  const users = await client.users.getUserList({ limit: 1 });
  assert.equal(users.totalCount, 1);
  assert.equal(users.data.length, 1);
  const user = users.data[0];
  const primary = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId,
  );
  assert.equal(primary?.verification?.status, 'verified');
  const profileNameReady = [user.firstName, user.lastName, user.username].some(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
  stage = 'existing-active-session';
  const sessions = await client.sessions.getSessionList({
    userId: user.id,
    status: 'active',
    limit: 2,
  });
  console.log(
    `CLERK_SESSION_PRECHECK total=${sessions.totalCount} returned=${sessions.data.length} activeReturned=${sessions.data.filter((item) => item.status === 'active').length} profileNameReady=${profileNameReady}`,
  );
  assert.ok(sessions.totalCount >= 1);
  const session = sessions.data.find(
    (item) =>
      item.status === 'active' &&
      item.userId === user.id &&
      item.actor === null,
  );
  assert.ok(session, 'Existing non-impersonated active session required');
  // Obtain a short-lived token for the existing session; never create a session.
  let token;
  let claims;
  const validateToken = async () => {
    token = await client.sessions.getToken(session.id, undefined, 60);
    assert.ok(typeof token.jwt === 'string' && token.jwt.length > 0);
    claims = JSON.parse(
      Buffer.from(token.jwt.split('.')[1], 'base64url').toString('utf8'),
    );
    assert.equal(claims.iss, 'https://clerk.booking.kortek.cloud');
    assert.equal(claims.sub, user.id);
    assert.equal(claims.sid, session.id);
    // BAPI does not carry the original browser Origin. Never fabricate azp.
    assert.equal(claims.azp, undefined);
  };

  stage = 'read-only-bootstrap-service';
  const db = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });
  try {
    const resolved = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return new ClerkBootstrapService({ db: tx }).resolve(user.id);
    });
    assert.deepEqual(resolved, {
      state: 'ONBOARDING_REQUIRED',
      user: null,
      preferredOrganizationId: null,
      memberships: [],
    });
  } finally {
    await db.$disconnect();
  }

  stage = 'production-config';
  const env = {
    ...parse(readFileSync(path.join(apiRoot, '.env'))),
    ...process.env,
    NODE_ENV: 'production',
    DEPLOY_ENV: 'production',
    APP_RELEASE: process.env.APP_RELEASE,
    HOST: '127.0.0.1',
    PORT: String(port),
    JWT_SECRET: randomBytes(32).toString('hex'),
    RATE_LIMIT_SECRET: randomBytes(32).toString('hex'),
    WEB_PUBLIC_ORIGIN: 'https://booking.kortek.cloud',
    API_PUBLIC_ORIGIN: 'https://api.booking.kortek.cloud',
    CORS_ALLOWED_ORIGINS: 'https://booking.kortek.cloud',
    CLERK_AUTHORIZED_PARTIES: c1Parties.join(','),
    CLERK_INVITATION_REDIRECT_URL:
      'https://booking.kortek.cloud/accept-invitation',
    PUBLIC_BOOKING_CLOSED: 'true',
    REQUIRE_INTERNAL_MFA: 'false',
    NOTIFICATIONS_EMAIL_ENABLED: 'false',
    NOTIFICATIONS_EMAIL_DOMAIN_VERIFIED: 'false',
  };
  delete env.C1_CLERK_SESSION_SMOKE;
  validateProductionConfig(env);
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
  stage = 'api-start';
  child = spawn(process.execPath, ['dist/main.js'], {
    cwd: apiRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const drain = (chunk) => {
    startupLog = (startupLog + chunk.toString('utf8')).slice(-65_536);
  };
  child.stdout.on('data', drain);
  child.stderr.on('data', drain);
  let ready = false;
  const startupDeadline = Date.now() + 60_000;
  while (Date.now() < startupDeadline) {
    assert.equal(child.exitCode, null);
    assert.equal(child.signalCode, null);
    try {
      await request('/');
      ready = true;
      break;
    } catch {
      await delay(200);
    }
  }
  assert.ok(ready);
  stage = 'public-transport-probe';
  const transport = await request('/');
  assert.equal(transport.status, 404);
  assert.match(
    transport.headers.get('x-request-id') ?? '',
    /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i,
  );
  await transport.text();
  stage = 'fresh-session-token';
  await validateToken();
  stage = 'invalid-token';
  const invalid = await request('/auth/clerk/bootstrap', {
    Authorization: 'Bearer invalid-c1-token',
  });
  assert.equal(invalid.status, 401);
  await invalid.text();
  stage = 'missing-azp-rejection';
  const authenticated = await request('/auth/clerk/bootstrap', {
    Authorization: `Bearer ${token.jwt}`,
    Origin: 'https://booking.kortek.cloud',
  });
  assert.equal(authenticated.status, 401);
  const diagnostic = await client.authenticateRequest(
    new Request(`${origin}/auth/clerk/bootstrap`, {
      headers: {
        Authorization: `Bearer ${token.jwt}`,
        Origin: 'https://booking.kortek.cloud',
      },
    }),
    {
      acceptsToken: 'session_token',
      authorizedParties: c1Parties,
      clockSkewInMs: 10_000,
    },
  );
  assert.equal(diagnostic.isAuthenticated, false);
  assert.equal(
    diagnostic.reason,
    TokenVerificationErrorReason.TokenInvalidAuthorizedParties,
  );
  assert.equal(
    authenticated.headers.get('access-control-allow-origin'),
    'https://booking.kortek.cloud',
  );
  await authenticated.text();
  stage = 'no-tenant-access';
  const denied = await request('/services', {
    Authorization: `Bearer ${token.jwt}`,
    'x-organization-id': '00000000-0000-4000-8000-000000000001',
  });
  assert.equal(denied.status, 401);
  await denied.text();
  stage = 'cors-localhost';
  const local = await request(
    '/',
    {
      Origin: 'http://localhost:3001',
      'Access-Control-Request-Method': 'GET',
    },
    'OPTIONS',
  );
  assert.equal(local.headers.get('access-control-allow-origin'), null);
  await local.text();
  console.log(
    `CLERK_PRODUCTION_SESSION_CHECK_OK providerActive=true emailVerified=true profileNameReady=${profileNameReady} bootstrapServiceReadOnly=ONBOARDING_REQUIRED publicTransport=404-with-application-id invalid=401 bapiMissingAzp=401 tenant=401 corsLocalhost=denied browserApiSession=pending`,
  );
}

void main()
  .catch(() => {
    if (stage === 'api-start') {
      // Classify captured startup output; never print its raw text or values.
      console.error(
        JSON.stringify({
          childExit: child?.exitCode ?? 'running',
          childSignal: child?.signalCode ?? 'none',
          outputBytes: Buffer.byteLength(startupLog),
          startupFailed: startupLog.includes('API_START_FAILED'),
          prismaInitialization: startupLog.includes(
            'PrismaClientInitializationError',
          ),
          databaseAuthentication: /P1000|Authentication failed/.test(
            startupLog,
          ),
          databaseUnreachable: /P1001|reach database server/.test(startupLog),
          databaseTls: /P1011|TLS connection|peer certificate/i.test(
            startupLog,
          ),
          dependencyMissing: startupLog.includes('MODULE_NOT_FOUND'),
          nestStarted: startupLog.includes(
            'Nest application successfully started',
          ),
        }),
      );
    }
    console.error(`CLERK_PRODUCTION_SESSION_SMOKE_FAILED stage=${stage}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      for (let attempt = 0; attempt < 50; attempt++) {
        if (child.exitCode !== null || child.signalCode !== null) break;
        await delay(100);
      }
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
        process.exitCode = 1;
      }
    }
    clearTimeout(deadline);
  });
