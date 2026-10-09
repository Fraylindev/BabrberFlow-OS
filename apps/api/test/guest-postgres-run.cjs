// Current guest C1 integration runner. Own fresh cluster only, no historical helpers.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const api = path.join(root, 'apps/api');
const bin = path.resolve(
  process.env.GUEST_PG_BIN || 'C:/Program Files/PostgreSQL/18/bin',
);
const id = randomUUID().replaceAll('-', '');
const runRoot = path.join(root, '.tmp', `guest-c1-pg-${id}`);
const data = path.join(runRoot, 'data');
const evidenceRoot = path.join(
  root,
  'docs/quality/evidence/reserva-invitado-c1/postgres',
  id,
);
const database = `guest_c1_${id}_test`;
const secrets = Object.fromEntries(
  ['admin', 'migrator', 'runtime'].map((key) => [
    key,
    randomBytes(32).toString('hex'),
  ]),
);
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) =>
      !/DATABASE|POSTGRES|^PG|CLERK|JWT|CLOUDINARY|RESEND|EMAIL|NOTIFICATION|TOKEN|SECRET|PASSWORD|NODE_OPTIONS|RUN_.*INTEGRATION/.test(
        key,
      ),
  ),
);
const preload = path.join(__dirname, 'guest-postgres-no-dotenv.cjs');
const evidence = {
  id,
  database,
  bind: '127.0.0.1',
  commands: [],
  migrations: [],
  suites: [],
  cleanup: false,
  providersContacted: false,
};
let started = false;
let startAttempted = false;
let port;
fs.mkdirSync(runRoot, { recursive: false });
fs.mkdirSync(evidenceRoot, { recursive: true });

function sanitize(value) {
  let text = String(value ?? '');
  for (const secret of Object.values(secrets))
    text = text.replaceAll(secret, '[secret omitted]');
  return text.replace(
    /postgres(?:ql)?:\/\/[^\s"']+/gi,
    '[database URL omitted]',
  );
}
function run(command, args, label, options = {}) {
  const { allowFailure = false, ...spawnOptions } = options;
  const result = spawnSync(command, args, {
    cwd: api,
    env,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 300000,
    maxBuffer: 20 * 1024 * 1024,
    ...spawnOptions,
  });
  evidence.commands.push({ label, command, args, exitCode: result.status });
  fs.writeFileSync(
    path.join(evidenceRoot, `${label}.log`),
    sanitize(
      (result.stdout || '') +
        (result.stderr || '') +
        (result.error?.message || ''),
    ),
  );
  if (result.status !== 0 && !allowFailure)
    throw new Error(
      `${label} failed; exit=${result.status}; inspect sanitized evidence`,
    );
  console.log(`${label}: exit=${result.status}`);
  return (result.stdout || '').trim();
}
function executable(name) {
  return path.join(bin, `${name}.exe`);
}
function psql(label, username, password, db, args, input) {
  return run(
    executable('psql'),
    [
      '-X',
      '-v',
      'ON_ERROR_STOP=1',
      '-h',
      '127.0.0.1',
      '-p',
      String(port),
      '-U',
      username,
      '-d',
      db,
      ...args,
    ],
    label,
    { env: { ...env, PGPASSWORD: password }, input },
  );
}
function node(command, args, label, databaseUrl, extra = {}, options = {}) {
  return run(
    process.execPath,
    ['--require', preload, command, ...args],
    label,
    {
      ...options,
      env: {
        ...env,
        NODE_OPTIONS: `--require="${preload.replaceAll('\\', '/')}"`,
        DATABASE_URL: databaseUrl,
        JWT_SECRET: 'guest-c1-postgres-synthetic-jwt-secret',
        RATE_LIMIT_SECRET: 'guest-c1-postgres-synthetic-rate-secret',
        NOTIFICATIONS_EMAIL_ENABLED: 'false',
        ...extra,
      },
    },
  );
}
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const chosen = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return chosen;
}
async function main() {
  for (const name of ['postgres', 'initdb', 'pg_ctl', 'psql'])
    assert.ok(fs.existsSync(executable(name)), `Missing ${name}`);
  evidence.postgresBinary = run(
    executable('postgres'),
    ['--version'],
    'postgres-version',
  );
  const pwfile = path.join(runRoot, 'init-password');
  fs.writeFileSync(pwfile, secrets.admin, { flag: 'wx' });
  try {
    run(
      executable('initdb'),
      [
        '-D',
        data,
        '-U',
        'guest_c1_admin',
        '--auth-local=trust',
        '--auth-host=scram-sha-256',
        '--encoding=UTF8',
        '--locale=C',
        `--pwfile=${pwfile}`,
      ],
      'initdb',
    );
  } finally {
    fs.unlinkSync(pwfile);
  }
  port = await freePort();
  evidence.port = port;
  startAttempted = true;
  run(
    executable('pg_ctl'),
    [
      '-D',
      data,
      '-l',
      path.join(runRoot, 'postgres.log'),
      '-o',
      `-h 127.0.0.1 -p ${port}`,
      '-w',
      'start',
    ],
    'start',
    { stdio: 'ignore', timeout: 60000 },
  );
  started = true;
  psql(
    'bootstrap',
    'guest_c1_admin',
    secrets.admin,
    'postgres',
    [],
    `CREATE ROLE kortek_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '${secrets.migrator}';
     CREATE ROLE kortek_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '${secrets.runtime}';
     CREATE DATABASE ${database} OWNER kortek_migrator;
     REVOKE ALL ON DATABASE ${database} FROM PUBLIC;
     GRANT CONNECT ON DATABASE ${database} TO kortek_runtime;`,
  );
  const migratorUrl = `postgresql://kortek_migrator:${secrets.migrator}@127.0.0.1:${port}/${database}`;
  const runtimeUrl = `postgresql://kortek_runtime:${secrets.runtime}@127.0.0.1:${port}/${database}`;
  node(
    require.resolve('prisma/build/index.js', { paths: [api] }),
    ['migrate', 'deploy', '--schema', path.join(api, 'prisma/schema.prisma')],
    'migrate-deploy',
    migratorUrl,
  );
  psql('provision-runtime', 'guest_c1_admin', secrets.admin, database, [
    '-f',
    path.join(api, 'ops/provision-database-roles.sql'),
  ]);
  psql('runtime-gate', 'kortek_runtime', secrets.runtime, database, [
    '-f',
    path.join(api, 'ops/verify-runtime-role.sql'),
  ]);
  evidence.postgresServer = psql(
    'server-version',
    'kortek_migrator',
    secrets.migrator,
    database,
    ['-At', '-c', 'SHOW server_version'],
  );
  evidence.migrations = psql(
    'migration-ledger',
    'kortek_migrator',
    secrets.migrator,
    database,
    [
      '-At',
      '-c',
      'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name',
    ],
  ).split(/\r?\n/);
  const migrations = fs
    .readdirSync(path.join(api, 'prisma/migrations'))
    .filter((name) =>
      fs.existsSync(path.join(api, 'prisma/migrations', name, 'migration.sql')),
    )
    .sort();
  assert.deepEqual(evidence.migrations, migrations);
  evidence.migrationHashes = migrations.map((name) => ({
    name,
    sha256: createHash('sha256')
      .update(
        fs.readFileSync(
          path.join(api, 'prisma/migrations', name, 'migration.sql'),
        ),
      )
      .digest('hex'),
  }));
  const jest = require.resolve('jest/bin/jest', { paths: [api] });
  const suites = [
    ['src/auth/clerk-user-link.integration.spec.ts', 2],
    ['src/business-schedule/business-schedule.integration.spec.ts', 26],
    ['src/bookings/booking-concurrency.integration.spec.ts', 9],
    ['src/public-booking/guest-claim-retirement.integration.spec.ts', 4],
  ];
  for (const [suite, expected] of suites) {
    const label = path.basename(suite).replace('.integration.spec.ts', '');
    const output = path.join(evidenceRoot, `${label}.json`);
    node(
      jest,
      [
        '--runInBand',
        '--runTestsByPath',
        suite,
        '--json',
        `--outputFile=${output}`,
      ],
      label,
      migratorUrl,
      {
        C1_RUNTIME_DATABASE_URL: runtimeUrl,
        RUN_POSTGRES_INTEGRATION: '1',
        RUN_BUSINESS_SCHEDULE_INTEGRATION: '1',
      },
      { allowFailure: true },
    );
    const result = JSON.parse(fs.readFileSync(output, 'utf8'));
    evidence.suites.push({
      suite,
      expected,
      passed: result.numPassedTests,
      failed: result.numFailedTests,
      pending: result.numPendingTests,
      exitCode: evidence.commands.at(-1).exitCode,
    });
    assert.equal(result.numTotalTests, expected);
    assert.equal(result.numPendingTests, 0);
  }
  assert.ok(
    evidence.suites.every(
      (suite) =>
        suite.failed === 0 &&
        suite.passed === suite.expected &&
        suite.exitCode === 0,
    ),
    'Integration failures remain; no suites were skipped',
  );
  if (process.env.GUEST_RUN_FULL_API === '1') {
    const output = path.join(evidenceRoot, 'full-api.json');
    node(
      jest,
      ['--runInBand', '--json', `--outputFile=${output}`],
      'full-api',
      migratorUrl,
      {
        C1_RUNTIME_DATABASE_URL: runtimeUrl,
        RUN_POSTGRES_INTEGRATION: '1',
        RUN_BUSINESS_SCHEDULE_INTEGRATION: '1',
      },
    );
    const result = JSON.parse(fs.readFileSync(output, 'utf8'));
    evidence.fullApi = {
      passed: result.numPassedTests,
      failed: result.numFailedTests,
      pending: result.numPendingTests,
      exitCode: 0,
    };
    assert.equal(result.numFailedTests, 0);
    assert.equal(result.numPendingTests, 0);
  }
}
main()
  .catch((error) => {
    evidence.failure = sanitize(error.message);
    process.exitCode = 1;
    console.error(evidence.failure);
  })
  .finally(() => {
    // This directory was created exclusively by this invocation; never target an existing cluster.
    assert.equal(path.dirname(runRoot), path.join(root, '.tmp'));
    assert.equal(path.basename(runRoot), `guest-c1-pg-${id}`);
    if (started || startAttempted) {
      try {
        run(
          executable('pg_ctl'),
          ['-D', data, '-m', 'fast', '-w', 'stop'],
          'stop',
          { stdio: 'ignore', timeout: 60000 },
        );
        started = false;
        evidence.stopped = true;
      } catch (error) {
        evidence.cleanupFailure = sanitize(error.message);
        process.exitCode = 1;
      }
    }
    if (!started && (!startAttempted || evidence.stopped)) {
      fs.rmSync(runRoot, { recursive: true, force: false });
      evidence.cleanup = true;
    }
    evidence.exitCode = process.exitCode || 0;
    fs.writeFileSync(
      path.join(evidenceRoot, 'run.json'),
      JSON.stringify(evidence, null, 2) + '\n',
    );
    console.log(
      `Evidence: ${path.relative(root, evidenceRoot)}; exit=${evidence.exitCode}; cleanup=${evidence.cleanup}`,
    );
  });
