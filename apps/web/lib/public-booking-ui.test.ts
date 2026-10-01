import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookingCalendar, calendarMonth, contactErrors } from './public-booking-ui.ts';

test('rangos civiles recortan hoy, bisiestos y extremo representable de C1', () => {
  assert.equal(calendarMonth('2026-10', '2026-10-12').from, '2026-10-12');
  assert.equal(calendarMonth('2028-02', '2028-02-01').dates.length, 29);
  assert.equal(calendarMonth('9999-12', '9999-12-01').to, '9999-12-30');
});
test('datos invitados admiten correo vacío e internacionales y cuenta exige ocho', () => {
  const draft = { clientName: 'Visitante', clientPhone: '+44 (123) 456-7890', clientEmail: '', password: '', createAccount: false, emailOptedIn: false };
  assert.deepEqual(contactErrors(draft), {});
  assert.ok(contactErrors({ ...draft, createAccount: true }).clientEmail);
  assert.ok(contactErrors({ ...draft, createAccount: true, password: '1234567' }).password);
  assert.ok(contactErrors({ ...draft, clientPhone: '+1 1234567890123456' }).clientPhone);
});
test('calendario pendiente preserva instantes, pliega UTF8 y no permite inyección ni IDs operativos', () => {
  const text = bookingCalendar({ booking: { id: 'private-booking', serviceId: 'private-service', professionalId: 'private-professional', startTime: '2026-10-05T14:00:00Z', endTime: '2026-10-05T14:30:00Z', status: 'PENDING' }, accountCreated: false, accountCreationError: null }, 'Corte\r\nATTENDEE:privado@example.test;á'.repeat(4), 'local-random', new Date('2026-10-01T00:00:00Z'))!;
  assert.match(text, /STATUS:TENTATIVE/);
  assert.match(text, /DTSTART:20261005T140000Z/);
  assert.match(text, /DTEND:20261005T143000Z/);
  assert.doesNotMatch(text, /\r\nATTENDEE:|private-booking|private-service|private-professional/);
  for (const line of text.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
});
