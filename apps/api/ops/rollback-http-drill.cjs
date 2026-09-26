// D12: loopback APIs on named local clones only. No production URL accepted.
// Recovery restores into a NEW local clone; existing databases are preserved.
const { spawn } = require('node:child_process');
const { createServer } = require('node:http');
const { createHash, randomBytes, randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { parseEnv } = require('node:util');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PrismaClient } = require('../node_modules/@prisma/client');
const { JwtService } = require('../node_modules/@nestjs/jwt');
const {
  ProfessionalAvailabilityService,
} = require('../dist/professionals/professional-availability.service');
const {
  zonedLocalDateTimeToUtc,
} = require('../dist/professionals/professional-availability.util');
const {
  EMAIL_NOTICE_VERSION,
} = require('../dist/notifications/notification-policy');

const root = path.resolve(__dirname, '../../..');
const config = parseEnv(readFileSync(path.join(root, 'apps/api/.env'), 'utf8'));
const local = new URL(config.DATABASE_URL);
assert.equal(local.username, 'kortek_runtime');
assert.ok(['localhost', '127.0.0.1'].includes(local.hostname));
assert.equal(local.port, '5432');
assert.ok(process.env.ROLLBACK_ADMIN_PASSWORD, 'Emergency credential required');
const runId = Date.now();
const sourceName = `kortek_c1_rollback_http_source_${runId}`;
const targetName = `kortek_c1_rollback_http_target_${runId}`;
const recoveredName = `kortek_c1_rollback_recovered_${runId}`;
const work = path.join(root, '.tmp/base-preprod-c1', recoveredName);
mkdirSync(work, { recursive: true });
const children = [];
const clients = [];
const apiEnvironment = { ...process.env };
delete apiEnvironment.ROLLBACK_ADMIN_PASSWORD;
let stage = 'preflight';
let upstream = 3331;
let frozen = false;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function databaseUrl(db, admin = false) {
  assert.ok([sourceName, targetName, recoveredName].includes(db));
  const url = new URL(local);
  url.pathname = `/${db}`;
  if (admin) {
    url.username = 'kortek_emergency_admin';
    url.password = process.env.ROLLBACK_ADMIN_PASSWORD;
  }
  return url.toString();
}
function client(db) {
  const prisma = new PrismaClient({
    datasourceUrl: databaseUrl(db, true),
    log: [],
  });
  clients.push(prisma);
  return prisma;
}
async function command(args, password = false) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = [];
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', () => {});
    child.on('error', () =>
      reject(new Error('Local container command failed')),
    );
    child.on('close', (code) =>
      code === 0
        ? resolve(Buffer.concat(chunks).toString('utf8'))
        : reject(new Error('Local container command failed')),
    );
    child.stdin.end(password ? `${process.env.ROLLBACK_ADMIN_PASSWORD}\n` : '');
  });
}
async function pg(db, executable, args) {
  assert.ok([sourceName, targetName, recoveredName].includes(db));
  const shell =
    'IFS= read -r PGPASSWORD; PGPASSWORD=$(printf %s "$PGPASSWORD" | tr -d "\\r"); export PGPASSWORD; exec "$@"';
  return command(
    [
      'exec',
      '-i',
      'barberflow-postgres',
      'sh',
      '-c',
      shell,
      'sh',
      executable,
      '-h',
      '127.0.0.1',
      '-U',
      'kortek_emergency_admin',
      '-d',
      db,
      ...args,
    ],
    true,
  );
}
async function fingerprints(prisma) {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
  );
  const fingerprints = [];
  for (const { tablename } of tables) {
    assert.match(tablename, /^[A-Za-z_][A-Za-z_0-9]*$/);
    const [row] = await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS count, md5(coalesce(string_agg(row_to_json(t)::text, E'\\n' ORDER BY row_to_json(t)::text), '')) AS hash FROM public."${tablename}" t`,
    );
    fingerprints.push({ table: tablename, ...row });
  }
  return fingerprints;
}
async function start(db, port) {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: path.join(root, 'apps/api'),
    env: {
      ...apiEnvironment,
      ...config,
      DATABASE_URL: databaseUrl(db),
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: String(port),
      JWT_SECRET: jwtSecret,
      RATE_LIMIT_SECRET: randomBytes(32).toString('hex'),
      REQUIRE_INTERNAL_MFA: 'false',
      NOTIFICATIONS_EMAIL_ENABLED: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  for (let attempt = 0; attempt < 150; attempt++) {
    assert.equal(child.exitCode, null, 'Isolated API startup failed');
    try {
      await fetch(`http://127.0.0.1:${port}/`);
      return child;
    } catch {
      await delay(200);
    }
  }
  throw new Error('Isolated API startup timed out');
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  for (
    let attempt = 0;
    attempt < 50 && child.exitCode === null && child.signalCode === null;
    attempt++
  )
    await delay(100);
  assert.ok(
    child.exitCode !== null || child.signalCode !== null,
    'API shutdown timed out',
  );
}
const jwtSecret = randomBytes(48).toString('hex');
let token;
const observedStatuses = [];
async function http(route, method = 'GET', body, expected = 200) {
  const response = await fetch(`http://127.0.0.1:3333${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  observedStatuses.push(response.status);
  if (Array.isArray(expected))
    assert.ok(
      expected.includes(response.status),
      `Unexpected HTTP status at ${stage}`,
    );
  else
    assert.equal(
      response.status,
      expected,
      `Unexpected HTTP status at ${stage}`,
    );
  return text ? JSON.parse(text) : null;
}
const proxy = createServer(async (request, response) => {
  if (frozen && !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(503, { 'Content-Type': 'application/json' });
    response.end('{"message":"Escrituras pausadas durante recuperación"}');
    return;
  }
  try {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const result = await fetch(`http://127.0.0.1:${upstream}${request.url}`, {
      method: request.method,
      headers: {
        Authorization: request.headers.authorization ?? '',
        'Content-Type': 'application/json',
      },
      ...(['GET', 'HEAD'].includes(request.method)
        ? {}
        : { body: Buffer.concat(chunks) }),
      signal: AbortSignal.timeout(5000),
    });
    response.writeHead(result.status, { 'Content-Type': 'application/json' });
    response.end(await result.text());
  } catch {
    response.writeHead(502, { 'Content-Type': 'application/json' });
    response.end('{"message":"Servicio temporalmente no disponible"}');
  }
});

(async () => {
  const bootstrapUrl = new URL(local);
  bootstrapUrl.pathname = '/postgres';
  bootstrapUrl.username = 'kortek_emergency_admin';
  bootstrapUrl.password = process.env.ROLLBACK_ADMIN_PASSWORD;
  const bootstrap = new PrismaClient({
    datasourceUrl: bootstrapUrl.toString(),
    log: [],
  });
  clients.push(bootstrap);
  const source = client(sourceName);
  const target = client(targetName);
  try {
    for (const name of [sourceName, targetName]) {
      assert.match(name, /^kortek_c1_rollback_http_(source|target)_\d+$/);
      await bootstrap.$executeRawUnsafe(
        `CREATE DATABASE "${name}" WITH TEMPLATE kortek_c1_rollback_source OWNER kortek_migrator`,
      );
    }
    await bootstrap.$disconnect();
    const baseline = await fingerprints(source);
    assert.equal(baseline.length, 31);
    assert.deepEqual(await fingerprints(target), baseline);
    for (const db of [source, target]) {
      const control = await db.emailChannelControl.findUnique({
        where: { id: 'EMAIL' },
      });
      assert.equal(control?.paused, true);
    }
    const membership = await target.membership.findFirst({
      where: {
        role: 'OWNER',
        organization: {
          professionals: { some: { status: 'ACTIVE' } },
          clients: { some: { isActive: true } },
          services: { some: { isActive: true } },
        },
      },
      select: { userId: true, organizationId: true },
    });
    assert.ok(membership, 'A complete tenant is required in the clone');
    token = new JwtService({ secret: jwtSecret }).sign(
      { sub: membership.userId, organizationId: membership.organizationId },
      { expiresIn: '15m' },
    );
    let first = await start(sourceName, 3331);
    let second = await start(targetName, 3332);
    await new Promise((resolve) => proxy.listen(3333, '127.0.0.1', resolve));
    const initialBookings = await http('/bookings');
    stage = 'failure-before-writes';
    upstream = 3332;
    assert.deepEqual(await http('/bookings'), initialBookings);
    await stop(second);
    await http('/bookings', 'GET', undefined, 502);
    upstream = 3331;
    assert.deepEqual(await http('/bookings'), initialBookings);
    assert.deepEqual(await fingerprints(source), baseline);
    assert.deepEqual(await fingerprints(target), baseline);
    console.log(
      'ROLLBACK_BEFORE_WRITES_OK http_failure=502 rollback_read=200 fingerprints=31/31',
    );

    stage = 'writes-on-target';
    second = await start(targetName, 3332);
    upstream = 3332;
    const organizationId = membership.organizationId;
    const organization = await target.organization.findUnique({
      where: { id: organizationId },
      select: { timeZone: true },
    });
    const professional = await target.professional.findFirst({
      where: { organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    const service = await target.service.findFirst({
      where: { organizationId, isActive: true },
      select: { id: true, duration: true },
    });
    const customer = await target.client.findFirst({
      where: { organizationId, isActive: true },
      select: { id: true },
    });
    const availability = new ProfessionalAvailabilityService(
      { db: target },
      {},
    );
    let slot;
    for (let day = 2; day < 16 && !slot; day++) {
      const date = new Date(Date.now() + day * 86400000)
        .toISOString()
        .slice(0, 10);
      for (let minute = 9 * 60; minute < 19 * 60 && !slot; minute += 30) {
        const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
        const start = zonedLocalDateTimeToUtc(
          date,
          time,
          organization.timeZone,
        );
        if (!start) continue;
        const end = new Date(start.getTime() + service.duration * 60000);
        const context = await availability.getPublicContext(
          organizationId,
          [professional.id],
          start,
          end,
        );
        const collisions = await target.booking.count({
          where: {
            professionalId: professional.id,
            status: { not: 'CANCELLED' },
            startTime: { lt: end },
            endTime: { gt: start },
          },
        });
        if (
          !collisions &&
          availability.isAvailableInContext(
            context,
            professional.id,
            start,
            end,
          )
        )
          slot = start;
      }
    }
    assert.ok(slot, 'A real available slot is required');
    stage = 'http-create-booking';
    const booking = await http(
      '/bookings',
      'POST',
      {
        clientId: customer.id,
        professionalId: professional.id,
        serviceId: service.id,
        startTime: slot.toISOString(),
        emailNotifications: {
          optedIn: false,
          noticeVersion: EMAIL_NOTICE_VERSION,
        },
      },
      201,
    );
    stage = 'http-confirm-booking';
    await http(`/bookings/${booking.id}/status`, 'PATCH', {
      status: 'CONFIRMED',
    });
    // Controlled time fixture in this clone lets the real COMPLETED guard run.
    // It does not alter the server clock or bypass the application's validation.
    stage = 'prepare-past-time-fixture';
    await target.booking.update({
      where: { id: booking.id },
      data: {
        startTime: new Date('2019-02-01T12:00:00Z'),
        endTime: new Date('2019-02-01T13:00:00Z'),
      },
    });
    stage = 'http-complete-booking';
    await http(`/bookings/${booking.id}/status`, 'PATCH', {
      status: 'COMPLETED',
    });
    stage = 'http-create-invoice';
    const invoice = await http(
      '/invoices',
      'POST',
      { bookingId: booking.id },
      201,
    );
    stage = 'http-record-payment';
    const statusOffset = observedStatuses.length;
    const payments = await Promise.all([
      http(
        `/invoices/${invoice.id}/payments`,
        'POST',
        { method: 'CASH' },
        [200, 201],
      ),
      http(
        `/invoices/${invoice.id}/payments`,
        'POST',
        { method: 'CASH' },
        [200, 201],
      ),
    ]);
    assert.deepEqual(observedStatuses.slice(statusOffset).sort(), [200, 201]);
    const paid = payments[0];
    assert.deepEqual(payments[1], paid);
    assert.equal(paid.state, 'PAID');
    await http(
      `/invoices/${invoice.id}/payments`,
      'POST',
      { method: 'CARD' },
      409,
    );
    const payment = await target.payment.findUnique({
      where: { invoiceId: invoice.id },
      select: { id: true },
    });
    assert.equal(
      await target.auditLog.count({
        where: { action: 'RECORD_INVOICE_PAYMENT', entityId: payment.id },
      }),
      1,
    );
    const otherTenant = await target.membership.findFirst({
      where: { organizationId: { not: organizationId }, role: 'OWNER' },
      select: { userId: true, organizationId: true },
    });
    assert.ok(otherTenant, 'A second tenant is required for the IDOR drill');
    const ownerToken = token;
    token = new JwtService({ secret: jwtSecret }).sign(
      { sub: otherTenant.userId, organizationId: otherTenant.organizationId },
      { expiresIn: '15m' },
    );
    await http(`/invoices/${invoice.id}`, 'GET', undefined, 404);
    await http(
      `/invoices/${invoice.id}/payments`,
      'POST',
      { method: 'CASH' },
      404,
    );
    assert.ok(!(await http('/bookings')).some((row) => row.id === booking.id));
    token = ownerToken;
    console.log(
      'RUNTIME_PAYMENT_CONCURRENCY_OK statuses=200,201 different_method=409 payments=1 audit_entries=1',
    );
    console.log(
      'RUNTIME_TENANT_ISOLATION_OK invoice_read=404 invoice_payment=404 foreign_booking_absent=true',
    );
    stage = 'prepare-media-fixture';
    const mediaId = randomUUID();
    await target.mediaAsset.create({
      data: {
        id: mediaId,
        organizationId,
        purpose: 'GALLERY',
        sha256: 'b'.repeat(64),
        bytes: 1,
        width: 1,
        height: 1,
        status: 'STAGED',
        moderationStatus: 'PENDING',
        altText: 'Fixture aislada D12 sin objeto Cloudinary',
        uploadedByUserId: membership.userId,
        stagingExpiresAt: new Date('2099-01-01'),
      },
    });
    stage = 'prepare-delivery-fixtures';
    const outbox = await target.emailOutbox.findMany({
      where: { bookingId: booking.id },
      orderBy: { eventSequence: 'asc' },
      select: { id: true },
    });
    assert.ok(outbox.length >= 3);
    // Synthetic external delivery states, explicitly isolated. No provider call.
    await target.emailOutbox.update({
      where: { id: outbox[0].id },
      data: {
        status: 'DELIVERED',
        reason: null,
        providerId: `rollback-drill-${randomUUID()}`,
        attempts: 1,
        firstDispatchedAt: new Date(),
        closedAt: new Date(),
      },
    });
    await target.emailOutbox.update({
      where: { id: outbox[1].id },
      data: {
        status: 'UNCERTAIN',
        reason: 'ROLLBACK_DRILL',
        attempts: 1,
        closedAt: null,
        leaseToken: randomUUID(),
        leaseExpiresAt: new Date(Date.now() - 60000),
      },
    });
    assert.equal(await source.booking.count({ where: { id: booking.id } }), 0);
    console.log(
      'ROLLBACK_TARGET_WRITES_OK booking_http=201 invoice_http=201 payment_http=201 media_fixture=1 outbox_states=DELIVERED,UNCERTAIN',
    );

    stage = 'freeze-and-recover';
    frozen = true;
    await http('/bookings', 'POST', {}, 503);
    await stop(first);
    await stop(second);
    await http('/bookings', 'GET', undefined, 502);
    const frozenData = await fingerprints(target);
    const containerDump = `/tmp/${recoveredName}.dump`;
    await pg(targetName, 'pg_dump', [
      '-Fc',
      '-n',
      'public',
      '-f',
      containerDump,
    ]);
    const list = await command([
      'exec',
      'barberflow-postgres',
      'pg_restore',
      '-l',
      containerDump,
    ]);
    const restoreList = list
      .split('\n')
      .filter((line) => !/^\d+;.* SCHEMA - public /.test(line))
      .join('\n');
    const listFile = path.join(work, 'restore.list');
    writeFileSync(listFile, restoreList);
    await command([
      'cp',
      `barberflow-postgres:${containerDump}`,
      path.join(work, 'target.dump'),
    ]);
    const dumpHash = createHash('sha256')
      .update(readFileSync(path.join(work, 'target.dump')))
      .digest('hex');
    await command([
      'cp',
      listFile,
      `barberflow-postgres:/tmp/${recoveredName}.list`,
    ]);
    // Names are generated internally, checked, and never supplied as SQL input.
    assert.match(recoveredName, /^kortek_c1_rollback_recovered_\d+$/);
    await source.$executeRawUnsafe(
      `CREATE DATABASE "${recoveredName}" OWNER kortek_migrator`,
    );
    const recovered = client(recoveredName);
    await recovered.$executeRawUnsafe(
      'CREATE EXTENSION IF NOT EXISTS btree_gist',
    );
    await recovered.$executeRawUnsafe(
      'REVOKE ALL ON DATABASE "' + recoveredName + '" FROM PUBLIC',
    );
    await recovered.$executeRawUnsafe(
      'GRANT CONNECT ON DATABASE "' + recoveredName + '" TO kortek_runtime',
    );
    await recovered.$executeRawUnsafe(
      'REVOKE CREATE ON SCHEMA public FROM PUBLIC',
    );
    await recovered.$executeRawUnsafe(
      'GRANT USAGE ON SCHEMA public TO kortek_runtime',
    );
    await pg(recoveredName, 'pg_restore', [
      '--single-transaction',
      '--exit-on-error',
      '--no-owner',
      '--no-acl',
      '--role=kortek_migrator',
      '-L',
      `/tmp/${recoveredName}.list`,
      containerDump,
    ]);
    await command([
      'cp',
      path.join(__dirname, 'apply-runtime-grants.sql'),
      'barberflow-postgres:/tmp/c1-rollback-grants.sql',
    ]);
    await pg(recoveredName, 'psql', [
      '-X',
      '-Atq',
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      '/tmp/c1-rollback-grants.sql',
    ]);
    assert.deepEqual(await fingerprints(recovered), frozenData);
    const runtime = new PrismaClient({
      datasourceUrl: databaseUrl(recoveredName),
      log: [],
    });
    clients.push(runtime);
    const gate = readFileSync(
      path.join(__dirname, 'verify-runtime-role.sql'),
      'utf8',
    ).match(/DO \$\$[\s\S]*?END \$\$;/)?.[0];
    assert.ok(gate);
    await runtime.$executeRawUnsafe(gate);
    console.log(
      `ROLLBACK_RESTORE_OK fingerprints=31/31 snapshot_sha256=${dumpHash} recovered_db=${recoveredName}`,
    );
    await start(recoveredName, 3334);
    upstream = 3334;
    const returned = await http(`/invoices/${invoice.id}`);
    assert.equal(returned.state, 'PAID');
    assert.deepEqual(returned.payment, paid.payment);
    assert.equal(returned.amount, paid.amount);
    assert.ok(
      (await http('/bookings')).some(
        (row) => row.id === booking.id && row.status === 'COMPLETED',
      ),
    );
    assert.equal(
      await recovered.mediaAsset.count({ where: { id: mediaId } }),
      1,
    );
    const worker = spawn(
      process.execPath,
      ['dist/notifications/email-worker.cli.js', '--once'],
      {
        cwd: path.join(root, 'apps/api'),
        env: {
          ...apiEnvironment,
          DATABASE_URL: databaseUrl(recoveredName),
          NOTIFICATIONS_EMAIL_ENABLED: 'false',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    worker.stdout.on('data', () => {});
    worker.stderr.on('data', () => {});
    const exit = await new Promise((resolve) => worker.on('close', resolve));
    assert.equal(exit, 0);
    assert.deepEqual(await fingerprints(recovered), frozenData);
    assert.deepEqual(await fingerprints(source), baseline);
    writeFileSync(
      path.join(work, 'evidence.json'),
      JSON.stringify(
        {
          recoveredName,
          dumpHash,
          tableFingerprints: frozenData,
          originalUnchanged: true,
          emailDisabled: true,
          externalDeliveryStates:
            'synthetic fixtures; no provider integration exercised',
          beforeWriteRollback: true,
          afterWriteRollback: true,
        },
        null,
        2,
      ),
    );
    console.log(
      'ROLLBACK_AFTER_WRITES_OK http_failure=502 freeze_write=503 rollback_read=200 paid=true original_unchanged=31/31 worker_once_exit=0 email_disabled=true',
    );
  } finally {
    await Promise.all(children.map(stop));
    await new Promise((resolve) => proxy.close(resolve));
    await Promise.all(clients.map((prisma) => prisma.$disconnect()));
  }
})().catch((error) => {
  console.error(
    `ROLLBACK_HTTP_DRILL_FAILED stage=${stage} class=${error?.constructor?.name === 'AssertionError' ? 'AssertionError' : 'ExecutionError'}`,
  );
  if (typeof error?.actual === 'number' && typeof error?.expected === 'number')
    console.error(
      `HTTP_STATUS actual=${error.actual} expected=${error.expected}`,
    );
  if (/^P\d{4}$/.test(error?.code ?? ''))
    console.error(`DATABASE_ERROR code=${error.code}`);
  process.exitCode = 1;
});
