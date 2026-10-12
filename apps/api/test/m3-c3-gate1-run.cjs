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
const runRoot = path.join(root, '.tmp', `m3-c3-g1-pg-${id}`);
const data = path.join(runRoot, 'data');
const evidenceRoot = path.join(
  root,
  'docs/quality/evidence/m3-calendario-c3-gate1/postgres',
  id,
);
const database = `guest_c1_${id}_test`;
const secrets = Object.fromEntries(
  ['admin', 'migrator', 'runtime'].map((key) => [
    key,
    randomBytes(32).toString('hex'),
  ]),
);
const allowedEnv = [
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
    allowedEnv.some((name) => name.toLowerCase() === key.toLowerCase()),
  ),
);
env.pnpm_config_verify_deps_before_run = 'false';
const preload = path.join(__dirname, 'guest-postgres-no-dotenv.cjs');
const networkGuard = path.join(__dirname, 'guest-network-guard.cjs');
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
  text = text.replace(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    '[synthetic JWT omitted]',
  );
  return text.replace(
    /postgres(?:ql)?:\/\/[^\s"']+/gi,
    '[database URL omitted]',
  );
}
function results(file) {
  const content = sanitize(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, content);
  return JSON.parse(content);
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
    ['--require', preload, '--require', networkGuard, command, ...args],
    label,
    {
      ...options,
      env: {
        ...env,
        NODE_OPTIONS: `--require="${preload.replaceAll('\\', '/')}" --require="${networkGuard.replaceAll('\\', '/')}"`,
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
  evidence.baseSha = run('git', ['rev-parse', 'HEAD'], 'base-sha', { cwd: root });
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
  node(
    path.join(root, 'apps/web/scripts/m3-c3-gate1-browser.mjs'),
    [],
    'web-real-api',
    runtimeUrl,
    {
      C1_RUNTIME_DATABASE_URL: runtimeUrl,
      M3_GATE1_MIGRATOR_URL: migratorUrl,
      M3_GATE1_EVIDENCE: evidenceRoot,
      NODE_ENV: 'test',
      DEPLOY_ENV: 'test',
    },
    { cwd: root, timeout: 300000 },
  );
  evidence.integration = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'integration.json'), 'utf8'));
  assert.equal(evidence.integration.failed, 0);
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
    assert.equal(path.basename(runRoot), `m3-c3-g1-pg-${id}`);
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
