import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SuccessView } from '@/app/[slug]/_components/SuccessView';
import { type PublicBookingResult } from '@/lib/api';
import { businessLocalInput } from '@/lib/business-time';

vi.mock('@/lib/queries/media', () => ({
  usePublicMedia: () => ({ data: null, isError: false, isFetching: false, refetch: vi.fn() }),
}));
afterEach(() => vi.useRealTimers());

function result(startTime: string): PublicBookingResult {
  return {
    booking: { id: 'booking', serviceId: 'service', professionalId: 'professional', startTime,
      endTime: new Date(Date.parse(startTime) + 1800000).toISOString(), status: 'PENDING' },
    accountCreated: false, accountCreationError: null,
  };
}
const success = (startTime: string, timeZone = 'America/Santo_Domingo') => {
  // Keep valid civil inputs for the old view too, so red proves its formatting gap.
  const civil = businessLocalInput(startTime, timeZone);
  const props = { result: result(startTime), organizationPhone: null, timeZone,
    date: civil.slice(0, 10), time: civil.slice(11) };
  return <SuccessView {...props} />;
};

it.each([
  ['2026-09-28T22:24:00Z', 'Hoy, 6:24 p. m.'],
  ['2026-09-27T22:24:00Z', 'Ayer, 6:24 p. m.'],
  ['2026-09-29T22:24:00Z', 'Mañana, 6:24 p. m.'],
  ['2026-09-26T22:24:00Z', '26 sept, 6:24 p. m.'],
  ['2025-09-26T22:24:00Z', '26 sept 2025, 6:24 p. m.'],
])('public success formats %s as %s without technical text', (startTime, text) => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-28T16:00:00Z'));
  const { container } = render(success(startTime));
  const date = screen.getByText(text);
  expect(date.tagName).toBe('TIME');
  expect(date).toHaveAttribute('datetime', new Date(startTime).toISOString());
  expect(date.getAttribute('title')).toMatch(/de (septiembre).*de 202[56], 6:24 p\. m\./);
  expect(container.textContent).not.toMatch(/America|UTC|GMT|PENDING|Confirmada/);
});

it('public success changes at business midnight while retaining the canonical instant', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-28T03:59:59Z'));
  render(success('2026-09-28T03:59:00Z'));
  expect(screen.getByText('Hoy, 11:59 p. m.')).toHaveAttribute('title', '27 de septiembre de 2026, 11:59 p. m.');
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText('Ayer, 11:59 p. m.')).toHaveAttribute('datetime', '2026-09-28T03:59:00.000Z');
});

it('the current year follows the business zone and updates when the zone changes', () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2027-01-01T02:00:00Z'));
  const { rerender } = render(success('2027-01-03T14:00:00Z'));
  expect(screen.getByText('3 ene 2027, 10:00 a. m.')).toBeInTheDocument();
  rerender(success('2027-01-03T14:00:00Z', 'Asia/Tokyo'));
  expect(screen.getByText('3 ene, 11:00 p. m.')).toHaveAttribute('title', '3 de enero de 2027, 11:00 p. m.');
});
