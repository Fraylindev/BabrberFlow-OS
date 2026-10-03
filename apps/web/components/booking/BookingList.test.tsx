import { describe, expect, it } from 'vitest';
import type { Booking } from '@/lib/api';
import { bookingNeedsAttention, visibleBookings } from '@/lib/booking-list';

const base: Booking = { id: 'pending', status: 'PENDING', invoice: null,
  startTime: '2026-10-01T14:00:00Z', endTime: '2026-10-01T15:00:00Z',
  clientId: 'client', professionalId: 'professional', serviceId: 'service' };

describe('Reservas por atender y orden de Todas', () => {
  it('conserva la reserva al completar y la retira al emitir factura', () => {
    const completed: Booking = { ...base, status: 'COMPLETED' };
    expect(visibleBookings([completed], 'TO_ATTEND')).toEqual([completed]);
    expect(visibleBookings([{ ...completed, invoice: { id: 'invoice', state: 'ISSUED' } }], 'TO_ATTEND')).toEqual([]);
  });
  it('no deduce emisión pendiente si se desconoce la factura', () => {
    expect(bookingNeedsAttention({ ...base, status: 'COMPLETED', invoice: undefined })).toBe(false);
  });
  it('prioriza atención y ordena cada grupo por fecha descendente sin mutar la respuesta', () => {
    const history: Booking = { ...base, id: 'history', status: 'CANCELLED', startTime: '2026-10-05T14:00:00Z' };
    const completed: Booking = { ...base, id: 'completed', status: 'COMPLETED', startTime: '2026-10-03T14:00:00Z' };
    const old: Booking = { ...history, id: 'old', startTime: '2026-09-01T14:00:00Z' };
    const source = [history, base, old, completed];
    expect(visibleBookings(source, 'ALL').map(row => row.id)).toEqual(['completed', 'pending', 'history', 'old']);
    expect(source.map(row => row.id)).toEqual(['history', 'pending', 'old', 'completed']);
    expect(visibleBookings([old, history], 'ALL')).toEqual([history, old]);
  });
});
