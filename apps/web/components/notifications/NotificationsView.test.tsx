import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { useEffect, type ReactNode } from 'react';
import { api, ApiError, type AuthUser } from '@/lib/api';
import { EMAIL_NOTICE_TEXT, type EmailHistoryPage, type EmailPreference } from '@/lib/notification-ui';
import { NotificationsView } from './NotificationsView';

const auth = vi.hoisted(() => ({ user: { id: 'actor-a', organizationId: 'tenant-a', role: 'OWNER', name: 'QA' } as AuthUser | null }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => auth }));
const bookingId = '00000000-0000-4000-8000-000000000001';
let history: EmailHistoryPage;
let preference: EmailPreference;
beforeEach(() => {
  auth.user = { id: 'actor-a', organizationId: 'tenant-a', role: 'OWNER', name: 'QA' };
  preference = { version: 2, optedIn: false, noticeVersion: null, recordedAt: null, source: null, contactReviewed: false };
  history = { data: [{ id: 'notice-a', bookingId, event: 'CREATED', channel: 'EMAIL', createdAt: '2026-09-15T14:00:00Z',
    status: 'RETRY', attempts: 1, reason: null, recipientMasked: '***@***', canRetry: true }],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
  vi.spyOn(api, 'get').mockImplementation(async (path) => {
    if (path.endsWith('/email-preference')) return preference;
    if (path === '/organizations/mine') return { timeZone: 'America/Santo_Domingo' };
    return history;
  });
});
function setup(id?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = (booking?: string) => <QueryClientProvider client={client}><NotificationsView bookingId={booking} /></QueryClientProvider>;
  return { ...render(view(id)), view, client };
}
it.each(['BARBER', 'CUSTOMER'])('rejects %s without requests, including a known booking', (role) => {
  // CUSTOMER is deliberately outside AuthUser's internal role union.
  auth.user = { ...auth.user!, role: role as AuthUser['role'] };
  setup(bookingId);
  expect(screen.getByRole('alert')).toHaveTextContent('No tienes permiso');
  expect(api.get).not.toHaveBeenCalled();
});
it('reception can read only booking history and cannot retry even if a stale row says true', async () => {
  auth.user!.role = 'RECEPTIONIST';
  const { rerender, view } = setup();
  expect(api.get).not.toHaveBeenCalled();
  rerender(view(bookingId));
  await screen.findByText('Reserva registrada');
  expect(api.get).toHaveBeenCalledWith(`/bookings/${bookingId}/notifications`, { page: '1', limit: '20' }, expect.anything());
  expect(screen.queryByRole('button', { name: 'Reintentar aviso' })).not.toBeInTheDocument();
});
it('requires choice and contact review, then sends the exact versioned contract without authority fields', async () => {
  const patch = vi.spyOn(api, 'patch').mockImplementation(async (_path, body) => {
    preference = { ...preference, ...(body as object), version: 3, contactReviewed: true };
    return preference;
  });
  setup(bookingId);
  const consent = await screen.findByLabelText(EMAIL_NOTICE_TEXT);
  expect(consent).not.toBeChecked();
  fireEvent.click(consent);
  expect(screen.getByRole('button', { name: 'Guardar preferencia' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Correo revisado con el cliente'), { target: { value: 'qa@example.test' } });
  fireEvent.click(screen.getByLabelText('El cliente eligió recibir estos avisos y revisé con él su correo registrado.'));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencia' }));
  await screen.findByText(/Preferencia guardada/);
  expect(patch).toHaveBeenCalledWith(`/bookings/${bookingId}/email-preference`, {
    expectedVersion: 2, optedIn: true, noticeVersion: 'booking-email-v1', reviewedEmail: 'qa@example.test',
  }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
});
it('withdraws without a reviewed email and does not replay on conflict; recovery fetches a fresh version', async () => {
  preference = { ...preference, optedIn: true, contactReviewed: true };
  const patch = vi.spyOn(api, 'patch').mockRejectedValue(new ApiError(409, 'raw constraint private@example.test'));
  setup(bookingId);
  fireEvent.click(await screen.findByLabelText(EMAIL_NOTICE_TEXT));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar preferencia' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('La preferencia o el correo cambió');
  expect(patch).toHaveBeenCalledTimes(1);
  expect(patch.mock.calls[0][1]).toEqual({ expectedVersion: 2, optedIn: false, noticeVersion: 'booking-email-v1' });
  expect(screen.queryByText(/raw constraint/)).not.toBeInTheDocument();
  preference = { ...preference, version: 3, optedIn: false };
  fireEvent.click(screen.getByRole('button', { name: 'Consultar estado actual' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(screen.getByLabelText(EMAIL_NOTICE_TEXT)).not.toBeChecked();
});
it('confirms a retry once and reports a request, never an email delivery', async () => {
  let complete!: (value: unknown) => void;
  const post = vi.spyOn(api, 'post').mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
  setup();
  fireEvent.click(await screen.findByRole('button', { name: 'Reintentar aviso' }));
  const confirm = screen.getByRole('button', { name: 'Confirmar reintento' });
  fireEvent.click(confirm); fireEvent.click(confirm);
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  expect(post.mock.calls[0].slice(0, 2)).toEqual(['/notifications/notice-a/retry', {}]);
  history = { ...history, data: [{ ...history.data[0], canRetry: false, status: 'PENDING' }] };
  await act(async () => complete(history.data[0]));
  await screen.findByText(/Reintento solicitado/);
  expect(screen.queryByRole('button', { name: 'Reintentar aviso' })).not.toBeInTheDocument();
});
it('paginates on the server and recovers from a history error without showing cached rows', async () => {
  history.pagination = { page: 1, limit: 20, total: 21, totalPages: 2 };
  const { client } = setup();
  await screen.findByText('Reserva registrada');
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/notifications', { page: '2', limit: '20' }, expect.anything()));
  vi.mocked(api.get).mockRejectedValue(new ApiError(503, 'sensitive'));
  await act(async () => { await client.invalidateQueries(); });
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar');
  expect(screen.queryByText('Reserva registrada')).not.toBeInTheDocument();
});
it('discards late mutations and form state during tenant A → B → A and aborts the departed visit', async () => {
  let complete!: (value: unknown) => void;
  const patch = vi.spyOn(api, 'patch').mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
  const { rerender, view } = setup(bookingId);
  fireEvent.click(await screen.findByRole('button', { name: 'Guardar preferencia' }));
  await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
  const signal = patch.mock.calls[0][2]!.signal;
  auth.user = { ...auth.user!, organizationId: 'tenant-b' };
  rerender(view(bookingId));
  expect(signal?.aborted).toBe(true);
  auth.user = { ...auth.user!, organizationId: 'tenant-a' };
  rerender(view(bookingId));
  await act(async () => complete(preference));
  expect(screen.queryByText(/Preferencia guardada/)).not.toBeInTheDocument();
  expect(await screen.findByLabelText(EMAIL_NOTICE_TEXT)).not.toBeChecked();
});
it('does not reuse a higher-privilege view on role or user changes', async () => {
  const { rerender, view } = setup(bookingId);
  await screen.findByText('Reserva registrada');
  auth.user = { ...auth.user!, role: 'BARBER' };
  rerender(view(bookingId));
  expect(screen.queryByText('Reserva registrada')).not.toBeInTheDocument();
  auth.user = null;
  rerender(view(bookingId));
  expect(screen.queryByText('Preferencia de correo')).not.toBeInTheDocument();
});

it('loads the new tenant after the authentication provider clears business queries', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function ScopeCleanup({ scope, children }: { scope: string; children: ReactNode }) {
    useEffect(() => { client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' }); }, [scope]);
    return children;
  }
  const view = () => <QueryClientProvider client={client}>
    <ScopeCleanup scope={auth.user!.organizationId}><NotificationsView /></ScopeCleanup>
  </QueryClientProvider>;
  const { rerender } = render(view());
  await screen.findByText('Reserva registrada');
  history = { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  auth.user = { ...auth.user!, organizationId: 'tenant-b' };
  rerender(view());
  expect(screen.queryByText('Reserva registrada')).not.toBeInTheDocument();
  await screen.findByText(/Todavía no hay avisos/);
  history = { ...history, data: [{ id: 'notice-returned', bookingId, event: 'CONFIRMED', channel: 'EMAIL',
    createdAt: '2026-09-15T14:00:00Z', status: 'OMITTED', attempts: 0, reason: null, recipientMasked: null, canRetry: false }] };
  auth.user = { ...auth.user!, organizationId: 'tenant-a' };
  rerender(view());
  await screen.findByText('Reserva confirmada');
});
