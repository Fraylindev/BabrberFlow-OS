import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { spawnSync } from 'node:child_process';
const root = path.resolve(__dirname, '../../..');
const output = path.join(root, 'docs/quality/evidence/m3-calendario-c3-gate1/checks');
fs.mkdirSync(output, { recursive: true });
const allowed = [
  'PATH',
  'SystemRoot',
  'WINDIR',
  'TEMP',
  'TMP',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'COMSPEC',
  'PNPM_HOME',
  'NUMBER_OF_PROCESSORS',
  'PROCESSOR_ARCHITECTURE',
  'OS',
  'HOMEDRIVE',
  'HOMEPATH',
];
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    allowed.some((name) => name.toLowerCase() === key.toLowerCase()),
  ),
);
Object.assign(env, {
  NEXT_TELEMETRY_DISABLED: '1',
  DEPLOY_ENV: 'development',
  NEXT_PUBLIC_API_URL: 'http://127.0.0.1:31999',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    'pk_test_' + Buffer.from('synthetic-m3.clerk.accounts.dev$').toString('base64'),
  CLERK_SECRET_KEY: 'sk_test_synthetic_m3_not_a_credential',
  RATE_LIMIT_SECRET: 'm3-synthetic-rate-secret-at-least-32',
  JWT_SECRET: 'm3-synthetic-jwt-secret-at-least-32',
  NOTIFICATIONS_EMAIL_ENABLED: 'false',
  REQUIRE_INTERNAL_MFA: 'false',
  NODE_OPTIONS:
    '--require="' +
    path.join(root, 'apps/api/test/guest-postgres-no-dotenv.cjs').replaceAll('\\', '/') +
    '" --require="' +
    path.join(root, 'apps/api/test/guest-network-guard.cjs').replaceAll('\\', '/') + '"',
});
const commands = [
  ['api-type-check', 'api', 'type-check'],
  ['api-lint', 'api', 'lint'],
  ['api-build', 'api', 'build'],
  ['api-calendar-unit', 'api', 'test', ['--runInBand', '--runTestsByPath', 'src/bookings/calendar.service.spec.ts']],
  ['web-type-check', 'web', 'type-check:clean'],
  ['web-lint', 'web', 'lint'],
  ['web-test', 'web', 'test'],
  ['web-build', 'web', 'build', ['--webpack']],
];
const selected = process.argv[2];
const results = [];
for (const [label, target, script, extraArgs = []] of commands) {
  if (selected && label !== selected) continue;
  const start = Date.now();
  const result = spawnSync(
    'pnpm.cmd',
    ['--config.verify-deps-before-run=false', '--filter', target, script, ...extraArgs],
    {
      cwd: root,
      env,
      encoding: 'utf8',
      windowsHide: true,
      shell: true,
      timeout: 300000,
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  let log = (result.stdout || '') + (result.stderr || '') + (result.error?.message || '');
  for (const name of [
    'CLERK_SECRET_KEY',
    'JWT_SECRET',
    'RATE_LIMIT_SECRET',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  ])
    log = log.replaceAll(env[name], '[synthetic omitted]');
  fs.writeFileSync(path.join(output, label + '.log'), log);
  const row = {
    label,
    command: [
      'pnpm',
      '--config.verify-deps-before-run=false',
      '--filter',
      target,
      script,
      ...extraArgs,
    ].join(' '),
    exitCode: result.status,
    elapsedMs: Date.now() - start,
  };
  results.push(row);
  console.log(JSON.stringify(row));
  if (result.status !== 0) {
    process.exitCode = 1;
    break;
  }
}
const file = path.join(output, selected ? selected + '.json' : 'run.json');
fs.writeFileSync(
  file,
  JSON.stringify({ syntheticOnly: true, noDotenv: true, results }, null, 2) + '\n',
);
