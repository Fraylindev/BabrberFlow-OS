const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const api = createRequire(path.resolve('apps/api/package.json'));
const { PrismaClient } = api('@prisma/client');
const { EmailWorker } = api('./dist/notifications/email-worker');
const { recordBookingEmailChange } = api('./dist/notifications/notification-producer');
const { EMAIL_NOTICE_VERSION } = api('./dist/notifications/notification-policy');
const url = new URL(process.env.DATABASE_URL);
assert.equal(url.hostname, '127.0.0.1');
assert.equal(url.port, '55439');
assert.ok(['/kortek_notifications_upgrade_test', '/kortek_notifications_recovery_test'].includes(url.pathname));
const db = new PrismaClient();
const config = { enabled: true, fromAddress: 'central@example.com', replyTo: 'reply@example.com', abuseSecret: 'controlled-32-character-secret-for-tests' };
const tenant = 'notify-upgrade-org';
async function main() {
  if (process.argv[2] === 'seed') {
    assert.ok(await db.emailOutbox.count() <= 3);
    for (const suffix of ['accepted', 'unknown', 'known']) {
      if (await db.booking.findUnique({ where: { id: `recovery-${suffix}` } })) continue;
      const day = ['accepted', 'unknown', 'known'].indexOf(suffix) + 1;
      await db.$transaction(async tx => {
        const booking = await tx.booking.create({ data: {
          id: `recovery-${suffix}`, organizationId: tenant, clientId: 'notify-upgrade-client',
          serviceId: 'notify-upgrade-service', professionalId: 'notify-upgrade-prof',
          startTime: new Date(`2030-01-0${day}T15:00:00Z`), endTime: new Date(`2030-01-0${day}T15:30:00Z`),
        } });
        await recordBookingEmailChange(tx, tenant, null, booking, { optedIn: true,
          noticeVersion: EMAIL_NOTICE_VERSION, reviewedEmail: 'client@example.com', source: 'STAFF' });
      });
      const remote = { send: async () => suffix === 'accepted' ? { kind: 'ACCEPTED', providerId: 'recovery-accepted' } : { kind: 'UNCERTAIN' }, retrieve: async () => null };
      await new EmailWorker(db, config, remote).tick();
    }
    await db.emailOutbox.updateMany({ where: { bookingId: 'recovery-known' }, data: { providerId: 'recovery-known' } });
    console.log('RECOVERY_FIXTURE_DISPATCHED');
    return;
  }
  const original = await db.emailOutbox.findMany({ orderBy: { bookingId: 'asc' } });
  assert.equal(original.length, 3);
  let sends = 0, reads = 0;
  const remote = { send: async (payload, key) => {
    sends++;
    const saved = original.find(row => row.bookingId === 'recovery-unknown');
    assert.equal(key, `notification/${saved.id}`);
    assert.deepEqual(payload, saved.sealedPayload);
    return { kind: 'ACCEPTED', providerId: 'reconciled-unknown' };
  }, retrieve: async id => { reads++; assert.equal(id, 'recovery-known'); return 'DELIVERED'; } };
  const disabled = new EmailWorker(db, { ...config, enabled: false }, remote);
  await disabled.tick();
  assert.equal(sends, 0);
  assert.equal(reads, 0);
  await db.emailOutbox.updateMany({ where: { status: 'UNCERTAIN' }, data: { nextAttemptAt: new Date(0) } });
  const worker = new EmailWorker(db, config, remote);
  for (let n = 0; n < 4; n++) await worker.tick();
  assert.equal(sends, 1);
  assert.equal(reads, 1);
  const rows = await db.emailOutbox.findMany({ orderBy: { bookingId: 'asc' } });
  assert.deepEqual(rows.map(r => r.status), ['ACCEPTED', 'DELIVERED', 'ACCEPTED']);
  assert.equal(rows.find(r => r.bookingId === 'recovery-accepted').attempts, 1);
  assert.deepEqual(rows.map(r => r.id), original.map(r => r.id));
  console.log('RESTORE_RECOVERY_PASS accepted_not_resent known_GET unknown_same_key_snapshot disabled_no_network');
}
main().finally(() => db.$disconnect()).catch(error => { console.error(error); process.exitCode = 1; });
