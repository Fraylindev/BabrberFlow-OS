import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ProfessionalAvailabilityModal } from '@/app/dashboard/professionals/ProfessionalAvailabilityModal';

const fixture = vi.hoisted(() => ({
  availability: { professionalId: 'professional', timeZone: 'America/New_York', inheritsOrganizationHours: true, weeklySchedule: [], blocks: [] as { id: string; startTime: string; endTime: string; status: string; note: string | null }[] },
  create: vi.fn(), update: vi.fn(),
}));
vi.mock('@/lib/queries/professionals', () => ({
  useProfessionalAvailabilityQuery: () => ({ data: fixture.availability, isLoading: false, isError: false }),
  useCreateProfessionalAvailabilityBlock: () => ({ mutateAsync: fixture.create, isPending: false }),
  useUpdateProfessionalAvailabilityBlock: () => ({ mutateAsync: fixture.update, isPending: false }),
  useReplaceProfessionalWeeklySchedule: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
const mount = () => render(<ProfessionalAvailabilityModal target={{ kind: 'own', userId: 'actor', organizationId: 'tenant' }} professionalName="Profesional controlado" isCurrentScope={() => true} onClose={vi.fn()} />);
beforeEach(() => { fixture.availability.blocks = []; fixture.create.mockResolvedValue({}); fixture.update.mockResolvedValue({}); });

it.each(['2026-11-01T01:30', '2030-03-10T02:30'])('rejects ambiguous or missing A2 wall time %s without an API write', async start => {
  mount(); fireEvent.click(screen.getByRole('button', { name: '+ Nuevo bloqueo' }));
  fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: start } });
  fireEvent.change(screen.getByLabelText('Fin'), { target: { value: `${start.slice(0,10)}T03:30` } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear bloqueo' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('esa hora no existe o se repite');
  expect(fixture.create).not.toHaveBeenCalled();
});

it('editing only a note preserves existing repeated-hour instants and their seconds', async () => {
  const block = { id: 'historical-block', startTime: '2026-11-01T05:30:17.123Z', endTime: '2026-11-01T07:30:19.456Z', status: 'ACTIVE', note: null };
  fixture.availability.blocks = [block]; mount(); fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  fireEvent.change(screen.getByLabelText('Nota interna (opcional)'), { target: { value: 'Nota actualizada' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(fixture.update).toHaveBeenCalledWith(expect.objectContaining({ blockId: block.id, input: { startTime: block.startTime, endTime: block.endTime, note: 'Nota actualizada' } })));
});
