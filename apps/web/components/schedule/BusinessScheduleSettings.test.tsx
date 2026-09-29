import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '@/lib/api';
import type { BusinessSchedule, ScheduleImpact } from '@/lib/business-schedule';
import { BusinessScheduleSettings } from './BusinessScheduleSettings';

const session = vi.hoisted(() => ({
  user: { id: 'actor-a', organizationId: 'tenant-a', role: 'OWNER' },
  organization: { id: 'tenant-a' },
  isReady: true,
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => session }));
const root = '/organizations/mine/schedule';
let current: BusinessSchedule;
function schedule(revision = 0): BusinessSchedule {
  return {
    revision,
    state: 'CONFIRMED',
    zoneConfirmed: true,
    timeZone: 'America/Santo_Domingo',
    region: { id: 'santo-domingo', label: 'Santo Domingo' },
    week: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      windows: [{ startTime: '09:00', endTime: '19:00' }],
    })),
    activeClosureCount: 0,
    management: {
      legacyCategory: 'SQL_NULL',
      ignoredLegacyKeys: [],
      proposedLegacyWeek: null,
      zoneChangeAllowed: true,
      dependencies: { bookings: 0, blocks: 0, closures: 0, promotions: 0, emailIntents: 0 },
    },
  };
}
function impact(conflictCount = 0): ScheduleImpact {
  return {
    revision: current.revision,
    evaluatedAt: '2030-01-01T12:00:00Z',
    protectedBookingCount: conflictCount,
    conflictCount,
    conflicts: {
      total: conflictCount,
      offset: 0,
      limit: 20,
      items: conflictCount
        ? [
            {
              id: 'booking-a',
              professionalId: 'professional-a',
              startTime: '2030-01-02T14:00:00Z',
              endTime: '2030-01-02T14:30:00Z',
            },
          ]
        : [],
    },
    professionalEffects: { total: 0, offset: 0, limit: 20, items: [], basis: 'RECURRING_WEEK' },
  };
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const tree = () => (
    <QueryClientProvider client={client}>
      <BusinessScheduleSettings />
    </QueryClientProvider>
  );
  const view = render(tree());
  return { ...view, client, change: () => view.rerender(tree()) };
}
const changeMonday = () =>
  fireEvent.change(screen.getByLabelText('Hasta · Lunes 1'), { target: { value: '18:00' } });
const review = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Revisar impacto de semana' }));
beforeEach(() => {
  session.user = { id: 'actor-a', organizationId: 'tenant-a', role: 'OWNER' };
  session.organization = { id: 'tenant-a' };
  session.isReady = true;
  current = schedule();
  vi.spyOn(api, 'get').mockImplementation(async (path) => {
    if (path === root) return structuredClone(current);
    if (path === `${root}/regions`)
      return [
        { id: 'santo-domingo', label: 'Santo Domingo' },
        { id: 'madrid', label: 'Madrid' },
      ];
    if (path === `${root}/closures`) return { items: [], total: 0, offset: 0, limit: 20 };
    if (path === '/professionals/professional-a') return { name: 'Profesional A' };
    throw new Error('Unexpected route');
  });
  vi.spyOn(api, 'post').mockImplementation(async (path) => {
    if (path.startsWith(`${root}/week/impact`)) return impact();
    if (path === `${root}/zone`) {
      current = { ...current, revision: current.revision + 1, zoneConfirmed: true };
      return { revision: current.revision };
    }
    return { revision: current.revision + 1 };
  });
  vi.spyOn(api, 'put').mockImplementation(async (_path, body) => {
    const command = body as { week: BusinessSchedule['week'] };
    current = { ...current, revision: current.revision + 1, week: command.week };
    return { revision: current.revision };
  });
});
describe('Horario D14/C2', () => {
  it.each(['BARBER', 'RECEPTIONIST'])(
    'reads global rules without privileged forms or notes for %s',
    async (role) => {
      session.user.role = role;
      vi.mocked(api.get).mockImplementation(async (path) =>
        path === root
          ? current
          : path.endsWith('/regions')
            ? [{ id: 'santo-domingo', label: 'Santo Domingo' }]
            : {
                items: [
                  {
                    id: 'closure-a',
                    startDate: '2030-01-01',
                    endDate: '2030-01-01',
                    startTime: '00:00',
                    endTime: '24:00',
                    status: 'ACTIVE',
                    reason: 'Private note must not render',
                  },
                ],
                total: 1,
                offset: 0,
                limit: 20,
              },
      );
      mount();
      await screen.findByText('Cierres del negocio');
      expect(screen.queryByText('Private note must not render')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Región' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Revisar impacto de semana' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Incluir cierres cancelados')).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/America\/|SQL_NULL/);
    },
  );
  it('ADMIN can edit the week but cannot confirm a region', async () => {
    session.user.role = 'ADMIN';
    mount();
    await screen.findByRole('button', { name: 'Revisar impacto de semana' });
    expect(screen.queryByRole('button', { name: 'Confirmar región' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Hasta · Lunes 1')).toBeInTheDocument();
  });
  it('requires impact review, invalidates it after editing and saves the exact reviewed revision', async () => {
    mount();
    await screen.findByLabelText('Hasta · Lunes 1');
    changeMonday();
    review();
    await screen.findByRole('button', { name: 'Guardar semana revisada' });
    fireEvent.change(screen.getByLabelText('Hasta · Lunes 1'), { target: { value: '17:00' } });
    expect(
      screen.queryByRole('button', { name: 'Guardar semana revisada' }),
    ).not.toBeInTheDocument();
    review();
    await screen.findByRole('button', { name: 'Guardar semana revisada' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar semana revisada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar acción' }));
    await screen.findByText('Horario guardado. La disponibilidad usa esta semana.');
    expect(api.put).toHaveBeenCalledWith(
      `${root}/week`,
      expect.objectContaining({
        expectedRevision: 0,
        week: expect.arrayContaining([
          expect.objectContaining({
            dayOfWeek: 1,
            windows: [{ startTime: '09:00', endTime: '17:00' }],
          }),
        ]),
      }),
      expect.anything(),
    );
  });
  it('conflicts prevent saving and show the actual interval in business time', async () => {
    vi.mocked(api.post).mockResolvedValue(impact(1));
    mount();
    await screen.findByLabelText('Hasta · Lunes 1');
    changeMonday();
    review();
    const save = await screen.findByRole('button', { name: 'Guardar semana revisada' });
    expect(save).toBeDisabled();
    expect(api.put).not.toHaveBeenCalled();
    expect(screen.getByText(/Profesional A ·/)).toHaveTextContent('10:00');
  });
  it('keeps edits after service failure and does not display raw diagnostics', async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(503, 'Prisma private constraint'));
    mount();
    await screen.findByLabelText('Hasta · Lunes 1');
    changeMonday();
    review();
    await screen.findByText(/Conservamos tu edición/);
    expect(screen.getByLabelText('Hasta · Lunes 1')).toHaveValue('18:00');
    expect(document.body.textContent).not.toContain('Prisma');
  });
  it('confirms the region without discarding a draft week', async () => {
    current.zoneConfirmed = false;
    current.state = 'LEGACY_UNCONFIRMED';
    mount();
    await screen.findByLabelText('Hasta · Lunes 1');
    changeMonday();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar región' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar acción' }));
    await screen.findByText(/Región confirmada/);
    expect(screen.getByLabelText('Hasta · Lunes 1')).toHaveValue('18:00');
  });
  it('disables changing the region when D9 reports persisted dependencies', async () => {
    current.management = {
      ...current.management!,
      zoneChangeAllowed: false,
      dependencies: { bookings: 1, blocks: 0, closures: 2, promotions: 0, emailIntents: 0 },
    };
    mount();
    await screen.findByLabelText('Hasta · Lunes 1');
    fireEvent.change(screen.getByRole('combobox', { name: 'Región' }), {
      target: { value: 'madrid' },
    });

    expect(screen.getByText(/Existen compromisos o historial/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar región' })).toBeDisabled();
    expect(api.post).not.toHaveBeenCalledWith(
      `${root}/zone`,
      expect.anything(),
      expect.anything(),
    );
  });
  it.each(['create', 'cancel'])(
    'preserves a separate draft week when a closure is %s',
    async (operation) => {
      const get = vi.mocked(api.get).getMockImplementation()!;
      vi.mocked(api.get).mockImplementation(async (path, params, options) => {
        if (path === `${root}/closures` && operation === 'cancel')
          return {
            items: [
              {
                id: 'closure-a',
                startDate: '2030-01-01',
                endDate: '2030-01-01',
                startTime: '00:00',
                endTime: '24:00',
                status: 'ACTIVE',
              },
            ],
            total: 1,
            offset: 0,
            limit: 20,
          };
        return get(path, params, options);
      });
      vi.mocked(api.post).mockImplementation(async (path) => {
        if (path.startsWith(`${root}/closures/impact`)) return impact();
        current = { ...current, revision: current.revision + 1 };
        return { revision: current.revision };
      });
      mount();
      await screen.findByLabelText('Hasta · Lunes 1');
      changeMonday();
      if (operation === 'create') {
        fireEvent.change(screen.getByLabelText('Desde la fecha'), {
          target: { value: '2030-01-01' },
        });
        fireEvent.change(screen.getByLabelText('Hasta la fecha · incluida'), {
          target: { value: '2030-01-02' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Revisar impacto del cierre' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Añadir cierre revisado' }));
      } else
        fireEvent.click(
          await screen.findByRole('button', { name: /^Cancelar cierre$/ }),
        );
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar acción' }));
      await screen.findByText(
        operation === 'create'
          ? 'Cierre añadido. Las reservas existentes se conservaron.'
          : 'Cierre cancelado. Su historial se conserva.',
      );
      expect(screen.getByLabelText('Hasta · Lunes 1')).toHaveValue('18:00');
    },
  );
  it('requires reconciliation after a write succeeds but the fresh read fails', async () => {
    mount();
    await screen.findByLabelText('Hasta · Lunes 1');
    changeMonday();
    review();
    await screen.findByRole('button', { name: 'Guardar semana revisada' });
    const get = vi.mocked(api.get).getMockImplementation()!;
    vi.mocked(api.get).mockImplementation(async (path, params, options) => {
      if (path === root) throw new ApiError(503, 'private diagnostic');
      return get(path, params, options);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar semana revisada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar acción' }));
    await screen.findByText(
      'Actualiza los datos para comprobar el resultado antes de otra acción. Conservamos tu edición.',
    );
    expect(screen.getByRole('button', { name: 'Revisar impacto de semana' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Guardar semana revisada' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Hasta · Lunes 1')).toHaveValue('18:00');
    vi.mocked(api.get).mockImplementation(get);
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar conservando edición' }));
    await screen.findByText(
      'Datos actualizados. Revisa el impacto de tu edición antes de guardar.',
    );
    expect(screen.getByRole('button', { name: 'Revisar impacto de semana' })).toBeEnabled();
  });
  it('ignores late impact from A after a complete A → B → A visit change', async () => {
    let finish!: (value: ScheduleImpact) => void;
    vi.mocked(api.post).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const view = mount();
    await screen.findByLabelText('Hasta · Lunes 1');
    changeMonday();
    review();
    session.user = { ...session.user, organizationId: 'tenant-b' };
    session.organization = { id: 'tenant-b' };
    view.change();
    await screen.findByLabelText('Hasta · Lunes 1');
    session.user = { ...session.user, organizationId: 'tenant-a' };
    session.organization = { id: 'tenant-a' };
    view.change();
    await screen.findByLabelText('Hasta · Lunes 1');
    await act(async () => finish(impact()));
    expect(
      screen.queryByRole('button', { name: 'Guardar semana revisada' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Hasta · Lunes 1')).toHaveValue('19:00');
  });
  it('unmounts privileged forms when a mutation reports revoked access', async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(403, 'revoked'));
    mount();
    await screen.findByLabelText('Hasta · Lunes 1');
    review();
    await screen.findByText('Tu acceso cambió. Actualiza tu sesión para continuar.');
    expect(screen.queryByLabelText('Hasta · Lunes 1')).not.toBeInTheDocument();
  });
  it('requires new impact after adopting a concurrent revision while retaining the draft', async () => {
    const view = mount();
    await screen.findByLabelText('Hasta · Lunes 1');
    changeMonday();
    review();
    await screen.findByRole('button', { name: 'Guardar semana revisada' });
    current = schedule(2);
    await act(async () => {
      await view.client.invalidateQueries({ queryKey: ['business-schedule'] });
    });
    await screen.findByText('El horario cambió mientras lo editabas. Actualiza para revisar tu edición con los datos vigentes.');
    expect(screen.getByRole('button', { name: 'Guardar semana revisada' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar conservando edición' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Guardar semana revisada' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Hasta · Lunes 1')).toHaveValue('18:00');
  });
});
