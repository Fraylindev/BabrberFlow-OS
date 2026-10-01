import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { SuccessView } from '@/app/[slug]/_components/SuccessView';
import { PublicMiniSite } from './PublicMiniSite';
import { api, type PublicBookingResult } from '@/lib/api';
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

it('the complete assistant uses booking-data zone for confirmation and success without changing POST', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-27T16:00:00Z'));
  const startTime = '2026-09-28T01:00:00.000Z';
  vi.spyOn(api, 'get').mockImplementation(async (path) => path.includes('/availability') ? {
    date: '2026-09-28', serviceId: 'service', slots: [{ time: '10:00', professionalId: 'professional', startTime }],
  } : {
    minimumBookingDate: '2026-09-28', timeZone: 'Asia/Tokyo',
    organization: { name: 'Negocio QA', slug: 'dates', phone: null, description: null, address: null, googleMapsUrl: null },
    services: [{ id: 'service', name: 'Servicio QA', description: null, duration: 30, price: '500.00' }],
    professionals: [{ id: 'professional', name: 'Profesional QA', bio: null, avatar: null }],
  });
  vi.spyOn(api, 'post').mockResolvedValue(result(startTime));
  Element.prototype.scrollIntoView = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><PublicMiniSite slug="dates" /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Reservar cita' }));
  fireEvent.click(await screen.findByRole('button', { name: /Servicio QA/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  fireEvent.click(screen.getByRole('button', { name: /Profesional QA/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-09-28' } });
  fireEvent.click(await screen.findByRole('button', { name: '10:00 a. m.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Visitante QA' } });
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '8095554321' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  expect(screen.getByText('Hoy, 10:00 a. m.')).toHaveAttribute('datetime', startTime);
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
  await screen.findByText('Tu reserva quedó registrada');
  expect(screen.getByText('Hoy, 10:00 a. m.')).toHaveAttribute('title', '28 de septiembre de 2026, 10:00 a. m.');
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  expect(api.post).toHaveBeenCalledWith('/public/dates/bookings', expect.objectContaining({ startTime }));
  expect(vi.mocked(api.post).mock.calls[0][1]).not.toHaveProperty('timeZone');
  expect(document.body.textContent).not.toMatch(/Asia|UTC|GMT/);
});
