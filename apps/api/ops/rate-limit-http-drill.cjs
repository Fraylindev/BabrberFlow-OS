// Run after `pnpm --filter api build`, with DATABASE_URL for the disposable QA.
// No credentials or response bodies are written to output.
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const path = require('node:path');
const assert = require('node:assert/strict');

if (!process.env.DATABASE_URL?.includes('prirlabbnlcuvnzuaczp')) {
  throw new Error('This drill requires the designated disposable Supabase QA');
}
const children = [];
const shared = {
  ...process.env,
  NODE_ENV: 'development',
  RATE_LIMIT_SECRET: randomBytes(32).toString('hex'),
  NOTIFICATIONS_EMAIL_ENABLED: 'false',
  PUBLIC_BOOKING_CLOSED: 'true',
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function start(port, host) {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...shared, PORT: String(port), HOST: host },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  // Drain logs without printing configuration, request data or provider errors.
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  const address = host === '::1' ? '[::1]' : host;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error('API startup failed');
    try {
      await fetch(`http://${address}:${port}/`);
      return child;
    } catch {
      await delay(200);
    }
  }
  throw new Error('API startup timed out');
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  for (let attempt = 0; attempt < 50 && child.exitCode === null && child.signalCode === null; attempt++) {
    await delay(100);
  }
  if (child.exitCode === null && child.signalCode === null) throw new Error('API shutdown timed out');
}

async function request(port, route, method, host, index) {
  const response = await fetch(`http://${host}:${port}${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': `198.51.100.${index + 1}`,
    },
    ...(method === 'POST' ? { body: '{}' } : {}),
  });
  await response.text();
  return response.status;
}

async function budget(route, method, limit, admitted, host = '127.0.0.1') {
  const results = [];
  for (let index = 0; index < limit + 2; index++) {
    results.push(await request(index % 2 ? 3321 : 3322, route, method, host, index));
  }
  const expected = [...Array(limit).fill(admitted), 429, 429];
  if (JSON.stringify(results) !== JSON.stringify(expected)) {
    console.error(`HTTP_BUDGET_MISMATCH route=${route} statuses=${results.join(',')}`);
  }
  assert.deepEqual(results, expected);
  console.log(`HTTP_SHARED_BUDGET_OK route=${route} admitted=${limit} blocked=2`);
}

(async () => {
  try {
    const first = await start(3321, '127.0.0.1');
    const second = await start(3322, '127.0.0.1');
    await budget('/auth/login', 'POST', 5, 400);
    await stop(first);
    const restarted = await start(3321, '127.0.0.1');
    assert.equal(await request(3321, '/auth/login', 'POST', '127.0.0.1', 99), 429);
    console.log('HTTP_RESTART_PERSISTENCE_OK');
    await budget('/auth/clerk/onboarding', 'POST', 10, 401);
    await budget('/auth/clerk/customer/claims', 'POST', 10, 401);
    await budget('/auth/clerk/bootstrap', 'GET', 30, 401);
    await budget('/auth/clerk/invitations/00000000-0000-4000-8000-000000000001/accept', 'POST', 10, 401);
    await budget('/public/c1-rate-drill/bookings', 'POST', 5, 400);
    await budget('/organizations/mine/cms', 'GET', 30, 401);
    await budget('/media/uploads', 'POST', 5, 401);
    await stop(restarted);
    await stop(second);
    // Bind only the IPv6 loopback, never all interfaces, for the second phase.
    await start(3321, '::1');
    await start(3322, '::1');
    await budget('/auth/login', 'POST', 5, 400, '[::1]');
    console.log('HTTP_IPV6_SHARED_OK forwarded_headers_untrusted=true');
  } finally {
    await Promise.all(children.map(stop));
  }
})().catch(() => {
  console.error('HTTP_RATE_DRILL_FAILED');
  process.exitCode = 1;
});
