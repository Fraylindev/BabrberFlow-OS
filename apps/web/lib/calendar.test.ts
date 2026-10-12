import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from './api.ts';
import {
  calendarError,
  calendarScope,
  canMoveCalendar,
  addBusinessDays,
  formatBusinessTime,
} from './calendar.ts';
for (const status of [400, 401, 403, 404, 409, 429, 503])
  test('useful private-safe message ' + status, () => {
    const message = calendarError(new ApiError(status, 'private SQL notes 123'));
    assert(!message.includes('SQL'));
    assert(!message.includes('123'));
    assert(message.length > 25);
  });
test('scope partitions actor tenant and role, BARBER cannot move', () => {
  const user = { id: 'a', organizationId: 'A', role: 'OWNER' as const, name: 'Synthetic' };
  assert.notEqual(calendarScope(user), calendarScope({ ...user, organizationId: 'B' }));
  assert.notEqual(calendarScope(user), calendarScope({ ...user, id: 'b' }));
  assert.notEqual(calendarScope(user), calendarScope({ ...user, role: 'BARBER' }));
  assert(!canMoveCalendar('BARBER'));
  assert(canMoveCalendar('RECEPTIONIST'));
});
test('civil dates and business clock preserve authoritative instant', () => {
  assert.equal(addBusinessDays('2026-12-31', 1), '2027-01-01');
  const result = formatBusinessTime('2026-10-12T14:10:00.123Z', 'America/Santo_Domingo', {
    relative: false,
  });
  assert.equal(result.dateTime, '2026-10-12T14:10:00.123Z');
  assert(!result.text.includes('UTC'));
  assert(!result.text.includes('Santo_Domingo'));
});
