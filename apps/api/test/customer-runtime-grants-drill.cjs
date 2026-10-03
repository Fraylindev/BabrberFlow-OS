// M2 C3 P1. Solo crea su propio contenedor local; nunca usa dotenv ni DB externa.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomBytes, randomUUID, createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const prior = '791569b110f9fd59cb10e6d248546bdae3996e14';
const runRoot = path.join(root, '.tmp/m2-c3-p1', randomUUID());
const current = path.join(runRoot, 'current');
const previous = path.join(runRoot, 'previous');
const container = `kortek-m2-c3-p1-${randomBytes(5).toString('hex')}`;
const database = 'kortek_m2_c3_test';
const port = 55447;
const secrets = Object.fromEntries(
  ['postgres', 'kortek_migrator', 'kortek_runtime'].map((role) => [
    role,
    randomBytes(32).toString('hex'),
  ]),
);
const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) =>
      !/DATABASE|POSTGRES|PGPASSWORD|CLERK|JWT|CLOUDINARY|RESEND|NOTIFICATION|EMAIL|E2E/.test(
        key,
      ),
  ),
);
const evidence = {
  priorApi: prior,
  runRoot: path.relative(root, runRoot).replaceAll('\\', '/'),
  port,
  commands: [],
  checks: [],
  cleanup: false,
};
let created = false;
function run(command, args, options = {}) {
  if (command === 'docker' && process.platform === 'win32')
    args = ['--context', 'desktop-linux', ...args];
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 300000,
    maxBuffer: 20 * 1024 * 1024,
    env: cleanEnv,
    ...options,
  });
  return result;
}
function requireSuccess(result, label) {
  if (result.status !== 0) {
    let diagnostic = result.stderr || result.error?.message || '';
    for (const secret of Object.values(secrets))
      diagnostic = diagnostic.replaceAll(secret, '[secreto omitido]');
    diagnostic = diagnostic
      .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[URL omitida]')
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '[id sintético]',
      );
    fs.writeFileSync(path.join(runRoot, 'failure.log'), diagnostic);
    throw Object.assign(new Error(label), { exitCode: result.status });
  }
  return result.stdout.trim();
}
function check(label) {
  evidence.checks.push(label);
  console.log(label);
}
function snapshot(destination, ref) {
  fs.mkdirSync(destination, { recursive: true });
  const files = requireSuccess(
    run('git', ['ls-tree', '-r', '--name-only', ref]),
    'git inventory',
  )
    .split(/\r?\n/)
    .filter(
      (file) =>
        file.startsWith('apps/api/') ||
        ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml'].includes(
          file,
        ),
    )
    .filter((file) => !path.basename(file).startsWith('.env'));
  for (const file of files) {
    const target = path.join(destination, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (destination === current) fs.copyFileSync(path.join(root, file), target);
    else {
      const value = spawnSync('git', ['show', `${ref}:${file}`], {
        cwd: root,
        maxBuffer: 20 * 1024 * 1024,
      });
      assert.equal(value.status, 0);
      fs.writeFileSync(target, value.stdout);
    }
  }
  if (destination === current) {
    for (const file of [
      'apps/api/ops/customer-stage-one-runtime-grants.sql',
      'apps/api/test/customer-runtime-grants-drill.cjs',
      'apps/api/test/customer-runtime-compat.cjs',
      'apps/api/test/customer-no-dotenv.cjs',
    ]) {
      fs.copyFileSync(path.join(root, file), path.join(destination, file));
    }
  }
  for (const relative of ['node_modules', 'apps/api/node_modules']) {
    fs.symlinkSync(
      path.join(root, relative),
      path.join(destination, relative),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  }
}
function psql(sql, role = 'postgres') {
  return run(
    'docker',
    [
      'exec',
      '-i',
      '--env',
      'PGPASSWORD',
      container,
      'psql',
      '-X',
      '-h',
      '127.0.0.1',
      '-U',
      role,
      '-d',
      database,
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
    ],
    {
      input: '\\set VERBOSITY verbose\n' + sql,
      env: { ...cleanEnv, PGPASSWORD: secrets[role] },
    },
  );
}
function sql(sqlText, role = 'postgres') {
  return requireSuccess(psql(sqlText, role), 'SQL isolated');
}
function include(file, role = 'postgres') {
  // Expande solo \ir del directorio ops copiado, antes de enviar SQL por stdin.
  const expand = (value) =>
    fs
      .readFileSync(value, 'utf8')
      .replace(/^\\ir ([^\r\n]+)$/gm, (_, relative) =>
        expand(path.resolve(path.dirname(value), relative.trim())),
      );
  return psql(expand(file), role);
}
function gate(expected = true) {
  const result = include(
    path.join(current, 'apps/api/ops/verify-runtime-role.sql'),
    'kortek_runtime',
  );
  assert.equal(result.status === 0, expected);
  return result;
}
function negative(label, statement) {
  const result = psql(statement, 'kortek_runtime');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /42501/);
  check(label);
}
function dbEnv(role) {
  // URL exclusivamente sintética y local, en memoria del proceso hijo; nunca se imprime.
  return {
    ...cleanEnv,
    DATABASE_URL: `postgresql://${role}:${secrets[role]}@127.0.0.1:${port}/${database}?schema=public`,
    NODE_ENV: 'test',
    DEPLOY_ENV: 'local',
    NOTIFICATIONS_EMAIL_ENABLED: 'false',
    PUBLIC_BOOKING_CLOSED: 'false',
    REQUIRE_INTERNAL_MFA: 'false',
    JWT_SECRET: randomBytes(32).toString('hex'),
    CLERK_SECRET_KEY: 'sk_test_synthetic_local_only',
    CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from('synthetic.clerk.accounts.dev$').toString('base64url')}`,
    CLERK_AUTHORIZED_PARTIES: 'http://127.0.0.1:3347',
    TS_NODE_TRANSPILE_ONLY: 'true',
    NODE_OPTIONS: `--require ${path.join(root, 'apps/api/test/customer-no-dotenv.cjs')}`,
    P1_NO_DOTENV_REPORT_DIR: path.join(runRoot, 'no-dotenv'),
  };
}
function prismaDeploy(destination) {
  const cwd = path.join(destination, 'apps/api');
  const result = run(
    process.execPath,
    [
      path.join(root, 'apps/api/node_modules/prisma/build/index.js'),
      'migrate',
      'deploy',
    ],
    { cwd, env: dbEnv('kortek_migrator') },
  );
  requireSuccess(result, 'prisma migrate deploy isolated');
}
function preserved() {
  const value =
    sql(`SELECT jsonb_build_object('user',(SELECT to_jsonb(u) FROM "User" u WHERE id='${ids.user}'),
    'client',(SELECT to_jsonb(c)-ARRAY['customerAccessBlocked','customerHistoryAmbiguous','customerBookingRevision'] FROM "Client" c WHERE id='${ids.client}'),
    'booking',(SELECT to_jsonb(b) FROM "Booking" b WHERE id='${ids.booking}'));`);
  return createHash('sha256').update(value).digest('hex');
}
const ids = Object.fromEntries(
  [
    'organization',
    'user',
    'otherUser',
    'client',
    'otherClient',
    'booking',
    'service',
    'professional',
  ].map((key) => [key, randomUUID()]),
);
async function main() {
  snapshot(previous, prior);
  snapshot(current, 'HEAD');
  fs.mkdirSync(path.join(runRoot, 'no-dotenv'), { recursive: true });
  // ID de la imagen PG17 ya instalada y leída en este equipo; no pull/instalación.
  const image = requireSuccess(
    run('docker', [
      'image',
      'inspect',
      'sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f',
      '--format',
      '{{.Id}}',
    ]),
    'PG17 image',
  );
  assert.match(image, /^sha256:[0-9a-f]{64}$/);
  evidence.image = image;
  requireSuccess(
    run(
      'docker',
      [
        'run',
        '--detach',
        '--rm',
        '--name',
        container,
        '--publish',
        `127.0.0.1:${port}:5432`,
        '--tmpfs',
        '/var/lib/postgresql/data:rw,size=512m',
        '--env',
        'POSTGRES_PASSWORD',
        '--env',
        `POSTGRES_DB=${database}`,
        '--env',
        'POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256 --auth-local=trust',
        image,
      ],
      { env: { ...cleanEnv, POSTGRES_PASSWORD: secrets.postgres } },
    ),
    'new disposable PG17',
  );
  created = true;
  evidence.postgresVersion = requireSuccess(
    run('docker', ['exec', container, 'postgres', '--version']),
    'PG17 version',
  );
  assert.match(evidence.postgresVersion, /PostgreSQL\) 17\./);
  for (let attempt = 0; attempt < 60; attempt++) {
    if (
      run('docker', [
        'exec',
        container,
        'pg_isready',
        '-U',
        'postgres',
        '-d',
        database,
      ]).status === 0
    )
      break;
    await new Promise((done) => setTimeout(done, 500));
  }
  sql(`CREATE ROLE kortek_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '${secrets.kortek_migrator}';
    CREATE ROLE kortek_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '${secrets.kortek_runtime}';
    ALTER DATABASE ${database} OWNER TO kortek_migrator;
    ALTER SCHEMA public OWNER TO kortek_migrator;`);
  prismaDeploy(previous);
  assert.equal(
    sql(
      'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;',
    ),
    '27',
  );
  requireSuccess(
    include(path.join(previous, 'apps/api/ops/provision-database-roles.sql')),
    'baseline roles',
  );
  requireSuccess(
    include(
      path.join(previous, 'apps/api/ops/verify-runtime-role.sql'),
      'kortek_runtime',
    ),
    'baseline runtime gate',
  );
  check('baseline27-runtime-login-gate');
  sql(`INSERT INTO "User" (id,"clerkUserId",email,name,"updatedAt") VALUES
    ('${ids.user}','m2_local_${ids.user}','client@test.invalid','Actor sintético',now()),
    ('${ids.otherUser}','m2_local_${ids.otherUser}','other@test.invalid','Otra identidad sintética',now());
    INSERT INTO "Organization" (id,slug,email,name,"updatedAt") VALUES ('${ids.organization}','${ids.organization}','tenant@test.invalid','Tenant desechable',now());
    INSERT INTO "Client" (id,"organizationId","userId",name,email,phone,"updatedAt") VALUES
    ('${ids.client}','${ids.organization}','${ids.user}','Cliente sintético','client@test.invalid','+18095550447',now()),
    ('${ids.otherClient}','${ids.organization}',NULL,'Otro cliente sintético',NULL,NULL,now());
    INSERT INTO "Service" (id,"organizationId",name,duration,price,"updatedAt") VALUES ('${ids.service}','${ids.organization}','Servicio sintético',30,100,now());
    INSERT INTO "Professional" (id,"organizationId",name,status,"isPublic","updatedAt") VALUES ('${ids.professional}','${ids.organization}','Profesional sintético','ACTIVE',true,now());
    INSERT INTO "Booking" (id,"organizationId","clientId","serviceId","professionalId","startTime","endTime","updatedAt") VALUES
    ('${ids.booking}','${ids.organization}','${ids.client}','${ids.service}','${ids.professional}','2099-03-01T13:00:00Z','2099-03-01T13:30:00Z',now());`);
  const before = preserved();
  prismaDeploy(current);
  assert.equal(
    sql(
      'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;',
    ),
    '28',
  );
  assert.equal(preserved(), before);
  assert.equal(
    sql(
      `SELECT "customerAccessBlocked" AND NOT "customerHistoryAmbiguous" AND "customerBookingRevision"=0 FROM "Client" WHERE id='${ids.client}';`,
    ),
    't',
  );
  gate(false);
  negative(
    'before-supplement-customer-select-denied',
    'SELECT count(*) FROM "CustomerOperation";',
  );
  requireSuccess(
    include(
      path.join(current, 'apps/api/ops/customer-stage-one-runtime-grants.sql'),
    ),
    'supplement',
  );
  gate();
  requireSuccess(
    include(
      path.join(current, 'apps/api/ops/customer-stage-one-runtime-grants.sql'),
    ),
    'supplement repeat',
  );
  requireSuccess(
    include(path.join(current, 'apps/api/ops/apply-runtime-grants.sql')),
    'full matrix repeat',
  );
  gate();
  check(
    'upgrade27to28-preserves-fixture-link-and-defaults-matrix37-idempotent',
  );
  assert.equal(sql('SELECT current_user;', 'kortek_runtime'), 'kortek_runtime');
  const invalidLogin = run(
    'docker',
    [
      'exec',
      '--env',
      'PGPASSWORD',
      container,
      'psql',
      '-X',
      '-h',
      '127.0.0.1',
      '-U',
      'kortek_runtime',
      '-d',
      database,
      '-c',
      'SELECT current_user;',
    ],
    { env: { ...cleanEnv, PGPASSWORD: randomBytes(32).toString('hex') } },
  );
  assert.notEqual(invalidLogin.status, 0);
  assert.match(invalidLogin.stderr, /password authentication failed/);
  check('runtime-tcp-login-rejects-wrong-password');
  const receipt = randomUUID();
  const receiptSql = `INSERT INTO "CustomerOperation" (id,"organizationId","actorUserId","clientId",operation,"keyDigest","commandDigest","bookingId","expiresAt") VALUES
    ('${receipt}','${ids.organization}','${ids.user}','${ids.client}','CREATE_BOOKING','${'a'.repeat(64)}','${'b'.repeat(64)}','${ids.booking}',now()+interval '1 hour');`;
  sql(receiptSql, 'kortek_runtime');
  assert.equal(
    sql('SELECT count(*) FROM "CustomerOperation";', 'kortek_runtime'),
    '1',
  );
  sql(
    `DELETE FROM "CustomerOperation" WHERE id='${receipt}';`,
    'kortek_runtime',
  );
  sql(receiptSql, 'kortek_runtime');
  check('customer-operation-select-insert-delete-runtime');
  for (const [label, statement] of [
    [
      'receipt-update-denied',
      'UPDATE "CustomerOperation" SET operation=operation;',
    ],
    ['receipt-truncate-denied', 'TRUNCATE "CustomerOperation";'],
    ['ledger-select-denied', 'SELECT count(*) FROM "_prisma_migrations";'],
    [
      'table-ownership-ddl-denied',
      'ALTER TABLE "CustomerOperation" ADD COLUMN forbidden integer;',
    ],
    [
      'function-ownership-denied',
      'ALTER FUNCTION customer_booking_revision() SECURITY DEFINER;',
    ],
    ['create-schema-denied', 'CREATE SCHEMA forbidden;'],
    ['create-temporary-table-denied', 'CREATE TEMP TABLE forbidden(id int);'],
    ['invoice-delete-denied', 'DELETE FROM "Invoice";'],
    ['payment-delete-denied', 'DELETE FROM "Payment";'],
    ['audit-delete-denied', 'DELETE FROM "AuditLog";'],
    [
      'trigger-create-denied',
      'CREATE TRIGGER forbidden AFTER INSERT ON "CustomerOperation" FOR EACH ROW EXECUTE FUNCTION customer_booking_revision();',
    ],
  ])
    negative(label, statement);
  assert.equal(
    sql(
      `SELECT NOT has_table_privilege('"CustomerOperation"','REFERENCES') AND NOT has_table_privilege('"CustomerOperation"','TRIGGER') AND NOT has_table_privilege('"CustomerOperation"','MAINTAIN');`,
      'kortek_runtime',
    ),
    't',
  );
  check('receipt-references-trigger-maintain-absent');
  sql('CREATE TABLE public."P1FutureTable"(id integer);', 'kortek_migrator');
  negative(
    'future-table-no-default-select',
    'SELECT count(*) FROM "P1FutureTable";',
  );
  gate(false);
  sql('DROP TABLE public."P1FutureTable";', 'kortek_migrator');
  const newBooking = randomUUID();
  const bookingSql = `INSERT INTO "Booking" (id,"organizationId","clientId","serviceId","professionalId","startTime","endTime","updatedAt") VALUES
    ('${newBooking}','${ids.organization}','${ids.client}','${ids.service}','${ids.professional}','2099-03-02T13:00:00Z','2099-03-02T13:30:00Z',now());`;
  sql('REVOKE UPDATE ON "Client" FROM kortek_runtime;');
  gate(false);
  negative('invoker-without-client-update-booking-atomic-denial', bookingSql);
  assert.equal(
    sql(`SELECT count(*) FROM "Booking" WHERE id='${newBooking}';`),
    '0',
  );
  sql('GRANT UPDATE ON "Client" TO kortek_runtime;');
  sql(bookingSql, 'kortek_runtime');
  assert.equal(
    sql(
      `SELECT "customerBookingRevision" FROM "Client" WHERE id='${ids.client}';`,
    ),
    '1',
  );
  sql(
    `UPDATE "Booking" SET status='CANCELLED' WHERE id='${newBooking}';`,
    'kortek_runtime',
  );
  assert.equal(
    sql(
      `SELECT "customerBookingRevision" FROM "Client" WHERE id='${ids.client}';`,
    ),
    '2',
  );
  sql(
    `UPDATE "Booking" SET "clientId"='${ids.otherClient}' WHERE id='${newBooking}';`,
    'kortek_runtime',
  );
  assert.equal(
    sql(
      `SELECT "customerBookingRevision" FROM "Client" WHERE id='${ids.client}';`,
    ),
    '3',
  );
  assert.equal(
    sql(
      `SELECT "customerBookingRevision" FROM "Client" WHERE id='${ids.otherClient}';`,
    ),
    '1',
  );
  sql(`DELETE FROM "Booking" WHERE id='${newBooking}';`);
  assert.equal(
    sql(
      `SELECT "customerBookingRevision" FROM "Client" WHERE id='${ids.otherClient}';`,
    ),
    '2',
  );
  check('booking-insert-update-reassign-delete-invoker-revisions');
  sql(
    `UPDATE "Client" SET "customerAccessBlocked"=false WHERE id='${ids.client}';`,
    'kortek_runtime',
  );
  sql(
    `UPDATE "Client" SET "userId"='${ids.otherUser}' WHERE id='${ids.client}';`,
    'kortek_runtime',
  );
  assert.equal(
    sql(
      `SELECT "customerAccessBlocked" FROM "Client" WHERE id='${ids.client}';`,
    ),
    't',
  );
  sql(
    `UPDATE "Client" SET "userId"='${ids.user}',"customerHistoryAmbiguous"=true,"customerAccessBlocked"=false WHERE id='${ids.client}';`,
    'kortek_runtime',
  );
  assert.equal(
    sql(
      `SELECT "customerAccessBlocked" AND "customerHistoryAmbiguous" FROM "Client" WHERE id='${ids.client}';`,
    ),
    't',
  );
  // Restaurar solo la fixture desechable para el ensayo del API anterior.
  sql(
    `UPDATE "Client" SET "customerHistoryAmbiguous"=false,"customerAccessBlocked"=true WHERE id='${ids.client}';`,
  );
  check('client-relink-blocks-and-ambiguous-quarantine-persists');
  for (const [regression, repair] of [
    [
      'GRANT UPDATE ON "CustomerOperation" TO kortek_runtime;',
      'REVOKE UPDATE ON "CustomerOperation" FROM kortek_runtime;',
    ],
    [
      'GRANT DELETE ON "Invoice" TO kortek_runtime;',
      'REVOKE DELETE ON "Invoice" FROM kortek_runtime;',
    ],
    [
      'GRANT EXECUTE ON FUNCTION customer_booking_revision() TO PUBLIC;',
      'REVOKE EXECUTE ON FUNCTION customer_booking_revision() FROM PUBLIC;',
    ],
    [
      'ALTER FUNCTION customer_booking_revision() SECURITY DEFINER;',
      'ALTER FUNCTION customer_booking_revision() SECURITY INVOKER;',
    ],
    [
      'ALTER FUNCTION customer_booking_revision() RESET search_path;',
      'ALTER FUNCTION customer_booking_revision() SET search_path=pg_catalog,public,pg_temp;',
    ],
    [
      'ALTER TABLE "Booking" DISABLE TRIGGER "Booking_customer_revision";',
      'ALTER TABLE "Booking" ENABLE TRIGGER "Booking_customer_revision";',
    ],
    [
      'ALTER DEFAULT PRIVILEGES FOR ROLE kortek_migrator GRANT SELECT ON TABLES TO kortek_runtime;',
      'ALTER DEFAULT PRIVILEGES FOR ROLE kortek_migrator REVOKE SELECT ON TABLES FROM kortek_runtime;',
    ],
  ]) {
    sql(regression);
    gate(false);
    sql(repair);
  }
  gate();
  check(
    'gate-rejects-excess-dml-public-execute-definer-searchpath-disabled-trigger-default-dml',
  );
  ids.postUpgradeBooking = randomUUID();
  sql(
    bookingSql
      .replaceAll(newBooking, ids.postUpgradeBooking)
      .replaceAll('2099-03-02', '2099-03-04'),
    'kortek_runtime',
  );
  sql(
    `DELETE FROM "CustomerOperation" WHERE id='${receipt}';`,
    'kortek_runtime',
  );
  sql(
    receiptSql.replaceAll(ids.booking, ids.postUpgradeBooking),
    'kortek_runtime',
  );
  const compat = run(
    process.execPath,
    [
      '-r',
      path.join(root, 'apps/api/node_modules/ts-node/register/transpile-only'),
      path.join(current, 'apps/api/test/customer-runtime-compat.cjs'),
    ],
    {
      cwd: path.join(previous, 'apps/api'),
      env: {
        ...dbEnv('kortek_runtime'),
        P1_FIXTURE: JSON.stringify(ids),
        P1_PREVIOUS_API: path.join(previous, 'apps/api'),
      },
    },
  );
  fs.writeFileSync(
    path.join(runRoot, 'compatibility.log'),
    (compat.stdout + compat.stderr)
      .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[URL omitida]')
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '[id sintético]',
      ),
  );
  requireSuccess(compat, 'previous API HTTP compatibility');
  const result = JSON.parse(compat.stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(result.runtime, 'kortek_runtime');
  evidence.compatibility = result;
  gate();
  check('previous-deployed-api-public-read-claim-booking-runtime-compatible');
  // Checks de API sobre copia exacta sin dotenv, reutilizando dependencias instaladas.
  for (const [label, args] of [
    ['type-check', ['--filter', 'api', 'type-check']],
    ['lint', ['--filter', 'api', 'lint']],
    ['tests', ['--filter', 'api', 'test', '--runInBand']],
    ['build', ['--filter', 'api', 'build']],
    ['prisma-validate', ['--filter', 'api', 'exec', 'prisma', 'validate']],
  ]) {
    // pnpm 11 puede instalar antes de run: impedirlo solo en este proceso.
    args.unshift(
      '--config.verify-deps-before-run=false',
      '--config.pm-on-fail=ignore',
    );
    const start = Date.now();
    const result =
      process.platform === 'win32'
        ? run('cmd.exe', ['/d', '/s', '/c', ['pnpm', ...args].join(' ')], {
            cwd: current,
            env: dbEnv('kortek_runtime'),
          })
        : run('pnpm', args, { cwd: current, env: dbEnv('kortek_runtime') });
    evidence.commands.push({
      label,
      command: ['pnpm', ...args].join(' '),
      exitCode: result.status,
      durationMs: Date.now() - start,
    });
    fs.writeFileSync(
      path.join(runRoot, `${label}.log`),
      (result.stdout + result.stderr).replace(
        /postgres(?:ql)?:\/\/[^\s"']+/gi,
        '[URL omitida]',
      ),
    );
    requireSuccess(result, label);
    check(`${label}-exit0`);
  }
  const migration28 = fs.readFileSync(
    path.join(
      root,
      'apps/api/prisma/migrations/20261003120000_customer_stage_one/migration.sql',
    ),
  );
  evidence.migration28Sha256 = createHash('sha256')
    .update(migration28)
    .digest('hex');
  assert.equal(
    evidence.migration28Sha256,
    '6e1d854f285f4a4a691377d6654d0a4df80f29ca5c3ad375b352ae96894d6dee',
  );
  evidence.dotenvGuard = fs
    .readdirSync(path.join(runRoot, 'no-dotenv'))
    .map((file) =>
      JSON.parse(
        fs.readFileSync(path.join(runRoot, 'no-dotenv', file), 'utf8'),
      ),
    )
    .reduce(
      (total, next) => ({
        processes: total.processes + 1,
        blockedProbes: total.blockedProbes + next.blockedProbes,
        blockedReads: total.blockedReads + next.blockedReads,
      }),
      { processes: 0, blockedProbes: 0, blockedReads: 0 },
    );
  assert.ok(evidence.dotenvGuard.processes >= 8);
  assert.ok(
    evidence.dotenvGuard.blockedProbes + evidence.dotenvGuard.blockedReads > 0,
  );
  check('implicit-dotenv-access-blocked-in-child-processes');
  evidence.complete = true;
}
main()
  .catch((error) => {
    evidence.complete = false;
    evidence.failure = {
      phase: error.message,
      errorClass: error.constructor.name,
      exitCode: error.exitCode ?? null,
    };
    console.error(JSON.stringify(evidence.failure));
    process.exitCode = 1;
  })
  .finally(() => {
    if (created) {
      // El nombre aleatorio solo se marca propio después de docker run exitoso.
      evidence.cleanup = run('docker', ['stop', container]).status === 0;
      if (!evidence.cleanup) process.exitCode = 1;
    }
    fs.mkdirSync(runRoot, { recursive: true });
    fs.writeFileSync(
      path.join(runRoot, 'result.json'),
      JSON.stringify(evidence, null, 2) + '\n',
    );
    console.log(
      JSON.stringify({
        complete: evidence.complete,
        cleanup: evidence.cleanup,
        report: path.relative(root, path.join(runRoot, 'result.json')),
      }),
    );
  });
