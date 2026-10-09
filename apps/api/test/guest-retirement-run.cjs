// Validaciones C1 locales sin dotenv, red de proveedores ni base real.
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const commands = {
  jest: 'jest/bin/jest.js',
  tsc: 'typescript/bin/tsc',
  eslint: 'eslint/bin/eslint.js',
  build: '@nestjs/cli/bin/nest.js',
  prettier: 'prettier/bin/prettier.cjs',
};
const [command, ...args] = process.argv.slice(2);
if (!commands[command]) throw new Error('Comando de validación C1 desconocido');
const preload = resolve(__dirname, 'customer-no-dotenv.cjs');
const result = spawnSync(
  process.execPath,
  [
    '--require',
    preload,
    resolve(root, 'node_modules', commands[command]),
    ...args,
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: `--require="${preload.replaceAll('\\', '/')}"`,
      JWT_SECRET: 'guest-retirement-synthetic-test-secret-32',
      RATE_LIMIT_SECRET: 'guest-retirement-synthetic-rate-secret-32',
      DATABASE_URL:
        'postgresql://synthetic:synthetic@127.0.0.1:1/synthetic_test',
      PUBLIC_BOOKING_CLOSED: 'false',
      REQUIRE_INTERNAL_MFA: 'false',
    },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
