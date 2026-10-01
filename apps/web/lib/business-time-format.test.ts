import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBusinessInstant } from './business-time.ts';

const zone = 'America/Santo_Domingo';
const now = new Date('2026-09-28T16:00:00Z');
test('F0-D: formato relativo exacto, sin semana ni año redundante', () => {
  for (const [instant, expected] of [
    ['2026-09-29T02:43:00Z', 'Hoy, 10:43 p. m.'],
    ['2026-09-27T22:24:00Z', 'Ayer, 6:24 p. m.'],
    ['2026-09-29T13:00:00Z', 'Mañana, 9:00 a. m.'],
    ['2026-09-26T22:24:00Z', '26 sept, 6:24 p. m.'],
    ['2025-09-26T22:24:00Z', '26 sept 2025, 6:24 p. m.'],
  ]) assert.equal(formatBusinessInstant(instant, zone, false, now), expected);
});
test('F0-D: la medianoche y el año se deciden en el negocio', () => {
  const instant = '2026-09-28T03:59:00Z';
  assert.equal(formatBusinessInstant(instant, zone, false, new Date('2026-09-28T03:59:59Z')), 'Hoy, 11:59 p. m.');
  assert.equal(formatBusinessInstant(instant, zone, false, new Date('2026-09-28T04:00:00Z')), 'Ayer, 11:59 p. m.');
  assert.equal(formatBusinessInstant('2025-09-26T22:24:00Z', zone, false, new Date('2026-01-01T02:00:00Z')), '26 sept, 6:24 p. m.');
  assert.equal(formatBusinessInstant('2026-01-01T03:30:00Z', zone, false, new Date('2026-01-01T05:00:00Z')), 'Ayer, 11:30 p. m.');
});
test('F0-D: dispositivo distinto, DST y horas de mediodía/medianoche', () => {
  const previous = process.env.TZ;
  try {
    for (const deviceZone of ['Asia/Tokyo', 'Pacific/Honolulu']) {
      process.env.TZ = deviceZone;
      assert.equal(formatBusinessInstant('2026-09-29T02:43:00Z', zone, false, now), 'Hoy, 10:43 p. m.');
      assert.equal(formatBusinessInstant('2026-03-08T06:30:00Z', 'America/New_York', false, new Date('2026-03-09T04:00:00Z')), 'Ayer, 1:30 a. m.');
    }
    assert.equal(formatBusinessInstant('2026-09-28T04:00:00Z', zone, false, now), 'Hoy, 12:00 a. m.');
    assert.equal(formatBusinessInstant('2026-09-28T16:00:00Z', zone, false, now), 'Hoy, 12:00 p. m.');
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});
