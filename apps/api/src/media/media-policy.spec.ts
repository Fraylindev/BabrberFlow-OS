import {
  isPromotionVisibleAt,
  promotionIntervalForBusinessDays,
  validatePromotionText,
} from './media-policy';

describe('editorial promotion policy', () => {
  it('accepts text without an executable economic promise', () => {
    expect(
      validatePromotionText(
        'Estilos de temporada',
        'Conoce los estilos que preparamos para esta temporada.',
      ),
    ).toBeNull();
  });

  it.each([
    'Reserva con 20 % de descuento',
    'Corte por RD$ 500',
    'Usa el cupón VERANO',
    'Solo quedan 3 turnos',
    'Cupos limitados para el mes',
    'Servicio gratis al reservar',
    'Paga 500 pesos por el servicio',
    'Reserva con promoción 2x1',
    'Reserva dos por uno este mes',
    '𝐏𝐫𝐞𝐜𝐢𝐨 especial este mes',
  ])('rejects economic claims: %s', (claim) => {
    expect(validatePromotionText('Campaña actual', claim)).toBe(
      'ECONOMIC_PROMISE',
    );
  });

  it('rejects markup, links, controls and empty content', () => {
    expect(
      validatePromotionText('Campaña actual', '<b>Reserva ahora</b>'),
    ).toBe('MARKUP_OR_LINK');
    expect(
      validatePromotionText('Campaña actual', 'Visita https://ejemplo.com'),
    ).toBe('MARKUP_OR_LINK');
    expect(
      validatePromotionText('Campaña actual', 'Texto\u0000 no seguro'),
    ).toBe('CONTROL_CHARACTER');
    expect(validatePromotionText('  ', 'Texto válido de ejemplo')).toBe(
      'LENGTH',
    );
  });
});

describe('authoritative business day interval', () => {
  it('uses the business zone and an exclusive UTC end', () => {
    const interval = promotionIntervalForBusinessDays(
      '2026-10-14',
      '2026-10-14',
      'America/Santo_Domingo',
    );
    expect(interval?.startsAtUtc.toISOString()).toBe(
      '2026-10-14T04:00:00.000Z',
    );
    expect(interval?.endsAtUtc.toISOString()).toBe('2026-10-15T04:00:00.000Z');
    expect(
      isPromotionVisibleAt(interval!, new Date('2026-10-15T03:59:59Z')),
    ).toBe(true);
    expect(
      isPromotionVisibleAt(interval!, new Date('2026-10-15T04:00:00Z')),
    ).toBe(false);
  });

  it('uses each actual midnight across a daylight saving transition', () => {
    const interval = promotionIntervalForBusinessDays(
      '2026-03-08',
      '2026-03-08',
      'America/New_York',
    );
    expect(interval?.startsAtUtc.toISOString()).toBe(
      '2026-03-08T05:00:00.000Z',
    );
    expect(interval?.endsAtUtc.toISOString()).toBe('2026-03-09T04:00:00.000Z');
  });

  it.each([
    ['2026-02-30', '2026-03-02', 'America/Santo_Domingo'],
    ['2026-10-15', '2026-10-14', 'America/Santo_Domingo'],
    ['2026-10-14', '2026-10-14', 'Invalid/Zone'],
    ['9999-12-31', '9999-12-31', 'America/Santo_Domingo'],
  ])('rejects invalid interval %s to %s in %s', (from, to, zone) => {
    expect(promotionIntervalForBusinessDays(from, to, zone)).toBeNull();
  });
});
