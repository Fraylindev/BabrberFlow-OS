import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { EMAIL_NOTICE_TEXT } from '@/lib/notification-ui';
import { PublicBookingFlow } from '@/components/public/PublicBookingScreen';

vi.mock('@/lib/queries/media', () => ({ usePublicMedia: () => ({ data: null, isError: false }) }));

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(api, 'get').mockImplementation(async (path) => path.includes('/availability-days') ? {
    from: '2026-10-01', to: '2026-10-31', serviceId: 'service-qa', availableDates: ['2026-10-05'],
  } : path.includes('/availability') ? {
    date: '2026-10-05', serviceId: 'service-qa', slots: [{ time: '10:00', professionalId: 'professional-qa', startTime: '2026-10-05T14:00:00.000Z' }],
  } : {
    minimumBookingDate: '2026-10-01', timeZone: 'America/Santo_Domingo', organization: { name: 'QA Avisos', slug: 'qa-avisos', phone: null, description: null, address: null, googleMapsUrl: null },
    services: [{ id: 'service-qa', name: 'Corte QA', duration: 30, price: '500.00', description: null }],
    professionals: [{ id: 'professional-qa', name: 'Alex QA', bio: null, avatar: null }],
  });
  vi.spyOn(api, 'post').mockResolvedValue({ booking: { id: 'booking-qa', status: 'PENDING', serviceId: 'service-qa', professionalId: 'professional-qa',
    startTime: '2026-10-05T14:00:00.000Z', endTime: '2026-10-05T14:30:00.000Z' }, accountCreated: false, accountCreationError: null });
});
async function contact() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><PublicBookingFlow slug="qa-avisos" /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: /Corte QA/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Elegir profesional' }));
  fireEvent.click(await screen.findByRole('button', { name: '5 de octubre de 2026' }));
  fireEvent.click(await screen.findByRole('button', { name: '10:00 a. m.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar con tus datos' }));
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Visitante QA' } });
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '8095550141' } });
}
async function confirm() {
  fireEvent.click(screen.getByRole('button', { name: 'Revisar reserva' }));
  fireEvent.click(screen.getByRole('button', { name: 'Registrar reserva' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  await screen.findByText('Tu reserva quedó registrada');
}
it('public opt-in starts unchecked, is independent of account creation and preserves the authoritative instant', async () => {
  await contact();
  expect(screen.getByLabelText(EMAIL_NOTICE_TEXT)).not.toBeChecked();
  fireEvent.change(screen.getByLabelText('Correo (opcional)'), { target: { value: 'avisos@example.test' } });
  fireEvent.click(screen.getByLabelText(EMAIL_NOTICE_TEXT));
  await confirm();
  expect(api.post).toHaveBeenCalledWith('/public/qa-avisos/bookings', expect.objectContaining({
    emailNotifications: { optedIn: true, noticeVersion: 'booking-email-v1' },
    clientEmail: 'avisos@example.test', startTime: '2026-10-05T14:00:00.000Z',
  }), expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(screen.queryByText(/Destinatario|Omitido|Entregado/)).not.toBeInTheDocument();
});
it('changing email clears the earlier choice; no inferred consent is posted', async () => {
  await contact();
  fireEvent.change(screen.getByLabelText('Correo (opcional)'), { target: { value: 'primero@example.test' } });
  fireEvent.click(screen.getByLabelText(EMAIL_NOTICE_TEXT));
  fireEvent.change(screen.getByLabelText('Correo (opcional)'), { target: { value: 'segundo@example.test' } });
  expect(screen.getByLabelText(EMAIL_NOTICE_TEXT)).not.toBeChecked();
  await confirm();
  expect(vi.mocked(api.post).mock.calls[0][1]).not.toHaveProperty('emailNotifications');
});
it('a choice without an email does not block a valid reservation or expose omission details', async () => {
  await contact();
  fireEvent.click(screen.getByLabelText(EMAIL_NOTICE_TEXT));
  await confirm();
  expect(vi.mocked(api.post).mock.calls[0][1]).toEqual(expect.objectContaining({
    clientEmail: undefined, emailNotifications: { optedIn: true, noticeVersion: 'booking-email-v1' },
  }));
  expect(screen.queryByText(/Omitido|Sin destinatario|Preferencia guardada/)).not.toBeInTheDocument();
});
vi.mock('@/components/customer/CustomerProvider', () => ({ useCustomer: () => ({ scope: 'public-notification-regression' }) }));
vi.mock('@/components/customer/CustomerClaim', () => ({ CustomerClaim: () => null }));
