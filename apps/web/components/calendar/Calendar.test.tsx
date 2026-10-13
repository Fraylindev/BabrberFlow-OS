import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import CalendarScreen from './CalendarScreen';
import { CalendarDetail } from './CalendarDetail';
import { api, ApiError } from '@/lib/api';
import { calendarApi, type CalendarBooking } from '@/lib/calendar';
const auth = vi.hoisted(() => ({
  user: {
    id: 'actor',
    name: 'Synthetic',
    organizationId: 'A',
    role: 'OWNER' as 'OWNER' | 'BARBER',
  },
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: auth.user }) }));
const booking: CalendarBooking = {
  id: 'one',
  client: { name: 'Synthetic A' },
  professional: { id: 'p', name: 'Synthetic professional' },
  service: { id: 's', name: 'Synthetic service' },
  status: 'PENDING',
  startTime: '2099-01-01T14:10:00Z',
  endTime: '2099-01-01T14:40:00Z',
  updatedAt: '2026-10-10T10:00:00.123Z',
  revision: 'm3.' + 'a'.repeat(64),
};
let client: QueryClient;
const mount = (node: React.ReactNode) =>
  render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2099-01-01T12:00:00Z'));
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  auth.user = { id: 'actor', name: 'Synthetic', organizationId: 'A', role: 'OWNER' };
  vi.spyOn(api, 'get').mockResolvedValue({ timeZone: 'America/Santo_Domingo' });
  vi.spyOn(api, 'getWithHeaders').mockResolvedValue({ data: [], headers: new Headers() });
  vi.spyOn(calendarApi, 'detail').mockResolvedValue(booking);
  vi.spyOn(calendarApi, 'page').mockImplementation(async (p) => ({
    timeZone: 'America/Santo_Domingo',
    from: p.from,
    to: p.to,
    rangeStart: '2099-01-01T04:00:00Z',
    rangeEnd: '2099-01-08T04:00:00Z',
    generatedAt: '2026-10-10T00:00:00Z',
    items: [],
    nextCursor: null,
  }));
  vi.spyOn(calendarApi, 'days').mockResolvedValue({
    bookingId: 'one',
    revision: booking.revision,
    updatedAt: booking.updatedAt,
    timeZone: 'America/Santo_Domingo',
    from: '2099-01-01',
    to: '2099-01-31',
    availableDates: ['2099-01-02', '2099-01-03'],
  });
  vi.spyOn(calendarApi, 'slots').mockImplementation(async (_, date) => ({
    bookingId: 'one',
    date,
    revision: booking.revision,
    updatedAt: booking.updatedAt,
    timeZone: 'America/Santo_Domingo',
    slots: [{ startTime: date + 'T14:30:00.000Z', endTime: date + 'T15:00:00.000Z' }],
  }));
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe('M3 frontend contract and visit lifecycle', () => {
  it('el calendario mensual deshabilita días sin slots y pide solo el mes consultado', async () => {
    mount(
      <CalendarDetail
        id="one"
        user={auth.user}
        zone="America/Santo_Domingo"
        onClose={() => {}}
        onMoved={() => {}}
        initialEdit
      />,
    );
    const available = await screen.findByRole('button', { name: '2 de enero de 2099' });
    expect(available).toBeEnabled();
    expect(
      screen.getByRole('button', { name: '4 de enero de 2099, sin horarios disponibles' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
    expect(calendarApi.days).toHaveBeenLastCalledWith(
      'one',
      '2099-01-01',
      '2099-01-31',
      expect.any(AbortSignal),
    );
    fireEvent.click(available);
    await screen.findByRole('button', { name: '10:30 a. m.' });
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    await waitFor(() =>
      expect(calendarApi.days).toHaveBeenLastCalledWith(
        'one',
        '2099-02-01',
        '2099-02-28',
        expect.any(AbortSignal),
      ),
    );
    expect(screen.queryByRole('button', { name: '10:30 a. m.' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar nuevo horario' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await screen.findByRole('button', { name: '2 de enero de 2099' });
    expect(calendarApi.days).toHaveBeenCalledTimes(2);
  });
  it('Hoy vuelve a la fecha del negocio sin cambiar vista ni filtros y sin cargar el periodo anterior', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-13T02:30:00Z'));
    mount(<CalendarScreen />);
    await screen.findByRole('button', { name: 'Hoy' });
    await waitFor(() => expect(calendarApi.page).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Día' }));
    await waitFor(() =>
      expect(calendarApi.page).toHaveBeenLastCalledWith(
        expect.objectContaining({ from: '2026-10-12', to: '2026-10-13' }),
        expect.any(AbortSignal),
      ),
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Estado' }), {
      target: { value: 'CONFIRMED' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Periodo anterior' }));
    await waitFor(() =>
      expect(calendarApi.page).toHaveBeenLastCalledWith(
        expect.objectContaining({ from: '2026-10-11', status: 'CONFIRMED' }),
        expect.any(AbortSignal),
      ),
    );
    vi.mocked(calendarApi.page).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    await waitFor(() => expect(calendarApi.page).toHaveBeenCalledOnce());
    expect(calendarApi.page).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: '2026-10-12', to: '2026-10-13', status: 'CONFIRMED' }),
      expect.any(AbortSignal),
    );
    expect(screen.getByRole('button', { name: 'Día' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('Hoy actualiza la semana actual empezando por la primera página, también tras un cursor', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-13T02:30:00Z'));
    vi.mocked(calendarApi.page).mockImplementation(async (params) => ({
      timeZone: 'America/Santo_Domingo',
      from: params.from,
      to: params.to,
      rangeStart: '2026-10-12T04:00:00Z',
      rangeEnd: '2026-10-19T04:00:00Z',
      generatedAt: '2026-10-13T02:30:00Z',
      items: [],
      nextCursor: params.cursor ? null : 'next-page',
    }));
    mount(<CalendarScreen />);
    await screen.findByRole('button', { name: 'Hoy' });
    await waitFor(() => expect(calendarApi.page).toHaveBeenCalled());
    const more = await screen.findByRole('button', { name: /Cargar más/ });
    fireEvent.click(more);
    await waitFor(() =>
      expect(calendarApi.page).toHaveBeenLastCalledWith(
        expect.objectContaining({ cursor: 'next-page' }),
        expect.any(AbortSignal),
      ),
    );
    vi.mocked(calendarApi.page).mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    await waitFor(() => expect(calendarApi.page).toHaveBeenCalledOnce());
    expect(vi.mocked(calendarApi.page).mock.calls[0][0]).not.toHaveProperty('cursor');
    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('loads slots only by selected date, caches return, sends both exact tokens and ISO once', async () => {
    const moved = vi
      .spyOn(calendarApi, 'move')
      .mockResolvedValue({ id: 'one', revision: 'new', updatedAt: 'new' });
    const onMoved = vi.fn();
    mount(
      <CalendarDetail
        id="one"
        user={auth.user}
        zone="America/Santo_Domingo"
        onClose={() => {}}
        onMoved={onMoved}
        initialEdit
      />,
    );
    await screen.findByRole('button', { name: '2 de enero de 2099' });
    expect(calendarApi.slots).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '2 de enero de 2099' }));
    await screen.findByRole('button', { name: '10:30 a. m.' });
    fireEvent.click(screen.getByRole('button', { name: '3 de enero de 2099' }));
    await waitFor(() => expect(calendarApi.slots).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: '2 de enero de 2099' }));
    fireEvent.click(await screen.findByRole('button', { name: '10:30 a. m.' }));
    expect(calendarApi.slots).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar nuevo horario' }));
    await waitFor(() => expect(onMoved).toHaveBeenCalledOnce());
    expect(moved).toHaveBeenCalledWith(
      'one',
      {
        startTime: '2099-01-02T14:30:00.000Z',
        expectedUpdatedAt: booking.updatedAt,
        expectedRevision: booking.revision,
      },
      expect.any(AbortSignal),
    );
  });
  it('BARBER detail is read-only with no availability request', async () => {
    auth.user = { ...auth.user, role: 'BARBER' };
    mount(
      <CalendarDetail
        id="one"
        user={auth.user}
        zone="America/Santo_Domingo"
        onClose={() => {}}
        onMoved={() => {}}
      />,
    );
    await screen.findByText('Synthetic A');
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).not.toBeInTheDocument();
    expect(calendarApi.days).not.toHaveBeenCalled();
  });
  it('revision mismatch prevents confirmation and asks for a fresh read', async () => {
    vi.mocked(calendarApi.slots).mockResolvedValue({
      bookingId: 'one',
      date: '2099-01-02',
      revision: 'different',
      updatedAt: booking.updatedAt,
      timeZone: 'America/Santo_Domingo',
      slots: [],
    });
    mount(
      <CalendarDetail
        id="one"
        user={auth.user}
        zone="America/Santo_Domingo"
        onClose={() => {}}
        onMoved={() => {}}
        initialEdit
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: '2 de enero de 2099' }));
    await screen.findByText('La reserva cambió mientras consultabas los horarios.');
    expect(screen.getByRole('button', { name: 'Confirmar nuevo horario' })).toBeDisabled();
  });
  it('A→B→A creates a fresh visit even for the same query, old cache removed', async () => {
    const view = mount(<CalendarScreen />);
    await waitFor(() => expect(calendarApi.page).toHaveBeenCalledTimes(1));
    auth.user = { ...auth.user, organizationId: 'B' };
    view.rerender(
      <QueryClientProvider client={client}>
        <CalendarScreen />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(calendarApi.page).toHaveBeenCalledTimes(2));
    auth.user = { ...auth.user, organizationId: 'A' };
    view.rerender(
      <QueryClientProvider client={client}>
        <CalendarScreen />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(calendarApi.page).toHaveBeenCalledTimes(3));
    const scopes = client
      .getQueryCache()
      .getAll()
      .filter((q) => q.queryKey[0] === 'm3-calendar');
    expect(scopes.every((q) => String(q.queryKey[1]).includes('"A"'))).toBe(true);
  });
  it('409 clears paginated display and restarts the cursor', async () => {
    vi.mocked(calendarApi.page).mockRejectedValueOnce(new ApiError(409, 'SQL')).mockResolvedValue({
      timeZone: 'America/Santo_Domingo',
      from: '2099-01-01',
      to: '2099-01-08',
      rangeStart: '2099-01-01T04:00:00Z',
      rangeEnd: '2099-01-08T04:00:00Z',
      generatedAt: '2026-10-10T00:00:00Z',
      items: [],
      nextCursor: null,
    });
    mount(<CalendarScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Recargar agenda desde el inicio' }));
    await screen.findByText('No hay citas en este periodo. Puedes consultar otra fecha.');
    expect(vi.mocked(calendarApi.page).mock.calls[1][0].cursor).toBeUndefined();
  });
});
