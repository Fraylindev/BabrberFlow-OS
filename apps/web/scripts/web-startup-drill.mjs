// Invalid configurations must fail in the actual Next CLI before serving/building.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(webRoot, 'node_modules/next/dist/bin/next');
if (process.argv.includes('--positive')) {
  assert.equal(process.env.C1_WEB_CONFIG_SMOKE, 'true');
  assert.equal(process.env.DEPLOY_ENV, 'production');
  const manifest = JSON.parse(
    readFileSync(path.join(webRoot, '.next/routes-manifest.json'), 'utf8'),
  );
  const rewrites = Array.isArray(manifest.rewrites)
    ? manifest.rewrites
    : Object.values(manifest.rewrites).flat();
  assert.equal(
    rewrites.find((item) => item.source === '/media-proxy/:slug/:token')?.destination,
    'https://api.booking.kortek.cloud/public/:slug/media/:token',
  );
  for (const [name, override] of [
    [
      'development-artifact-mix',
      {
        DEPLOY_ENV: 'development',
        WEB_PUBLIC_ORIGIN: '',
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3000',
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from('isolated.clerk.accounts.dev$').toString('base64url')}`,
        CLERK_SECRET_KEY: 'sk_test_NON_SECRET_FIXTURE',
      },
    ],
    [
      'changed-public-key',
      { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + '=' },
    ],
  ]) {
    const rejected = spawnSync(process.execPath, [cli, 'start', '-H', '127.0.0.1', '-p', '3342'], {
      cwd: webRoot,
      env: { ...process.env, ...override },
      encoding: 'utf8',
      timeout: 20_000,
    });
    assert.equal(rejected.error, undefined);
    assert.equal(rejected.status, 1);
    assert.ok(
      (rejected.stdout + rejected.stderr).includes('WEB_CONFIG_INVALID variable=BUILD_ENVIRONMENT'),
    );
    console.log(`WEB_BUILD_BINDING_REJECTED case=${name}`);
  }
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(3342, '127.0.0.1', () => server.close(resolve));
  });
  const child = spawn(process.execPath, [cli, 'start', '-H', '127.0.0.1', '-p', '3342'], {
    cwd: webRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    let response;
    for (let attempt = 0; attempt < 50; attempt++) {
      assert.equal(child.exitCode, null);
      assert.equal(child.signalCode, null);
      try {
        response = await fetch('http://127.0.0.1:3342/', {
          signal: AbortSignal.timeout(1000),
          redirect: 'error',
        });
        break;
      } catch {
        await delay(200);
      }
    }
    assert.equal(response?.status, 200);
    const body = await response.text();
    assert.ok(body.includes('Tu barbería'));
    assert.ok(process.env.CLERK_SECRET_KEY?.startsWith('sk_live_'));
    assert.equal(body.includes(process.env.CLERK_SECRET_KEY), false);
    console.log(
      'WEB_PRODUCTION_START_OK bind=loopback homepage=200 mediaRewrite=production secretInHtml=false',
    );
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    for (
      let attempt = 0;
      attempt < 50 && child.exitCode === null && child.signalCode === null;
      attempt++
    )
      await delay(100);
    assert.ok(child.exitCode !== null || child.signalCode !== null, 'Next did not stop');
  }
} else {
  const baseline = {
    ...process.env,
    NODE_ENV: 'production',
    DEPLOY_ENV: 'production',
    WEB_PUBLIC_ORIGIN: 'https://booking.kortek.cloud',
    NEXT_PUBLIC_API_URL: 'https://api.booking.kortek.cloud',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_live_${Buffer.from('clerk.booking.kortek.cloud$').toString('base64url')}`,
    CLERK_SECRET_KEY: 'sk_live_NON_SECRET_FIXTURE',
  };
  const cases = [
    ['environment-missing', { DEPLOY_ENV: '' }, 'DEPLOY_ENV'],
    ['api-missing', { NEXT_PUBLIC_API_URL: '' }, 'NEXT_PUBLIC_API_URL'],
    ['api-localhost', { NEXT_PUBLIC_API_URL: 'https://localhost:3000' }, 'NEXT_PUBLIC_API_URL'],
    ['api-http', { NEXT_PUBLIC_API_URL: 'http://api.booking.kortek.cloud' }, 'NEXT_PUBLIC_API_URL'],
    ['web-missing', { WEB_PUBLIC_ORIGIN: '' }, 'WEB_PUBLIC_ORIGIN'],
    ['key-missing', { CLERK_SECRET_KEY: '' }, 'CLERK_SECRET_KEY'],
    ['key-test', { CLERK_SECRET_KEY: 'sk_test_NON_SECRET_FIXTURE' }, 'CLERK_SECRET_KEY'],
    [
      'public-key-missing',
      { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: '' },
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    ],
  ];
  for (const mode of ['build', 'start']) {
    for (const [name, override, variable] of cases) {
      const args = [cli, mode, ...(mode === 'start' ? ['-H', '127.0.0.1', '-p', '3342'] : [])];
      const child = spawnSync(process.execPath, args, {
        cwd: webRoot,
        env: { ...baseline, ...override },
        encoding: 'utf8',
        timeout: 20_000,
      });
      // Captured output can contain local configuration; only print case labels.
      assert.equal(child.error, undefined, `Next did not terminate: ${mode}/${name}`);
      assert.equal(child.status, 1, `Next did not reject: ${mode}/${name}`);
      assert.ok(
        (child.stdout + child.stderr).includes(`WEB_CONFIG_INVALID variable=${variable}`),
        `Wrong failure: ${mode}/${name}`,
      );
      console.log(`WEB_CONFIG_REJECTED mode=${mode} case=${name}`);
    }
  }
  console.log('WEB_STARTUP_DRILL_OK rejected=16');
}
