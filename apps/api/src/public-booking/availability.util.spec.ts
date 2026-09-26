import {
  DEFAULT_BUSINESS_HOURS,
  generateCandidateSlots,
  rangesOverlap,
  resolveBusinessHours,
} from './availability.util';

describe('resolveBusinessHours', () => {
  it('devuelve el horario por defecto cuando el valor es null', () => {
    expect(resolveBusinessHours(null)).toEqual(DEFAULT_BUSINESS_HOURS);
  });

  it('devuelve el horario por defecto cuando el valor no tiene la forma esperada', () => {
    expect(resolveBusinessHours({ foo: 'bar' })).toEqual(
      DEFAULT_BUSINESS_HOURS,
    );
    expect(resolveBusinessHours('09:00')).toEqual(DEFAULT_BUSINESS_HOURS);
  });

  it('respeta un horario válido en el JSON de la organización', () => {
    expect(resolveBusinessHours({ open: '08:30', close: '17:00' })).toEqual({
      openMinutes: 8 * 60 + 30,
      closeMinutes: 17 * 60,
    });
  });

  it('ignora un horario donde el cierre es antes que la apertura', () => {
    expect(resolveBusinessHours({ open: '18:00', close: '09:00' })).toEqual(
      DEFAULT_BUSINESS_HOURS,
    );
  });
});

describe('generateCandidateSlots', () => {
  it('genera bloques cada 30 minutos que caben completos antes del cierre', () => {
    const slots = generateCandidateSlots(
      { openMinutes: 9 * 60, closeMinutes: 11 * 60 },
      30,
    );
    expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });

  it('excluye bloques cuya duración se pasaría del horario de cierre', () => {
    const slots = generateCandidateSlots(
      { openMinutes: 9 * 60, closeMinutes: 10 * 60 },
      45,
    );
    // Solo 09:00 cabe completo (09:00–09:45); 09:30 terminaría a las 10:15.
    expect(slots).toEqual(['09:00']);
  });
});

describe('rangesOverlap', () => {
  it('detecta solapamiento parcial', () => {
    const a1 = new Date('2026-08-01T10:00:00');
    const a2 = new Date('2026-08-01T10:30:00');
    const b1 = new Date('2026-08-01T10:15:00');
    const b2 = new Date('2026-08-01T10:45:00');
    expect(rangesOverlap(a1, a2, b1, b2)).toBe(true);
  });

  it('no marca solapamiento cuando un rango termina justo al empezar el otro', () => {
    const a1 = new Date('2026-08-01T10:00:00');
    const a2 = new Date('2026-08-01T10:30:00');
    const b1 = new Date('2026-08-01T10:30:00');
    const b2 = new Date('2026-08-01T11:00:00');
    expect(rangesOverlap(a1, a2, b1, b2)).toBe(false);
  });

  it('no marca solapamiento entre rangos completamente separados', () => {
    const a1 = new Date('2026-08-01T09:00:00');
    const a2 = new Date('2026-08-01T09:30:00');
    const b1 = new Date('2026-08-01T11:00:00');
    const b2 = new Date('2026-08-01T11:30:00');
    expect(rangesOverlap(a1, a2, b1, b2)).toBe(false);
  });
});
