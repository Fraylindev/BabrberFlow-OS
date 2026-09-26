import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from './api.ts';
import { canManageEmails, canReadBookingEmails, EMAIL_EVENTS, EMAIL_STATES, formatNotificationDate, notificationError, notificationReason } from './notification-ui.ts';

test('C1 maps five events and nine distinct results without provider text', () => {
  assert.equal(Object.keys(EMAIL_EVENTS).length, 5);
  assert.equal(new Set(Object.values(EMAIL_STATES)).size, 9);
  assert.equal(canManageEmails('RECEPTIONIST'), false);
  assert.equal(canReadBookingEmails('RECEPTIONIST'), true);
  for (const role of ['BARBER', 'CUSTOMER', undefined]) assert.equal(canReadBookingEmails(role), false);
  assert.ok(!notificationReason('private@example.test')!.includes('@'));
});
test('notifications format timestamps using business timezone rather than browser timezone', () => {
  assert.match(formatNotificationDate('2026-09-15T14:00:00Z', 'America/Santo_Domingo'), /10:00/);
  assert.match(formatNotificationDate('2026-09-15T14:00:00Z', 'America/Los_Angeles'), /7:00/);
});
test('all expected errors use safe actionable text regardless of backend body', () => {
  for (const status of [400, 401, 403, 404, 409, 503]) {
    const message = notificationError(new ApiError(status, 'Prisma secret@example.test'));
    assert.ok(!message.includes('Prisma') && !message.includes('@'));
  }
  assert.match(notificationError(new ApiError(409, ''), 'retry'), /ya no admite reintento/);
});
