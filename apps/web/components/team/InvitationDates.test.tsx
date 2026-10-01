import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import TeamPage from '@/app/dashboard/team/page';

const fixture = vi.hoisted(() => ({
  user: { id: 'actor', organizationId: 'tenant', role: 'OWNER', name: 'QA' },
  mutation: { isPending: false, variables: undefined, mutateAsync: vi.fn() },
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: fixture.user, organization: { name: 'QA' } }) }));
vi.mock('@/lib/queries/invoices', () => ({ useOrganizationTimeZoneQuery: () => ({ data: 'America/Santo_Domingo' }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/queries/team', () => ({
  useTeamMembersQuery: () => ({ data: { items: [], total: 0 } }),
  useTeamInvitationsQuery: () => ({ data: { items: ['FAILED', 'PENDING'].map((status, index) => ({
    id: `inv-${index}`, email: `qa${index}@example.test`, role: 'ADMIN', createPublicProfile: false,
    status, createdAt: '2026-09-30T22:24:00Z', expiresAt: '2026-10-07T22:24:00Z',
  })), total: 2 } }),
  useCreateTeamInvitation: () => fixture.mutation,
  useResendTeamInvitation: () => fixture.mutation,
  useRevokeTeamInvitation: () => fixture.mutation,
  useRevokeTeamMemberAccess: () => fixture.mutation,
  useUpdateTeamMemberRole: () => fixture.mutation,
}));
beforeEach(() => {
  fixture.user.role = 'OWNER';
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-30T23:00:00Z'));
});
it('no afirma Enviada para FAILED o PENDING; muestra vencimiento y conserva Reenviar', () => {
  render(<TeamPage />);
  fireEvent.click(screen.getByRole('tab', { name: 'Invitaciones' }));
  expect(screen.getByText('Administrador · No se pudo completar la acción')).toBeInTheDocument();
  expect(screen.getByText('La entrega del correo no está confirmada.')).toBeInTheDocument();
  expect(screen.queryByText(/Enviada/)).not.toBeInTheDocument();
  const dates = screen.getAllByText(/7 oct/);
  expect(dates).toHaveLength(2);
  for (const date of dates) {
    expect(date).toHaveAttribute('datetime', '2026-10-07T22:24:00.000Z');
    expect(date).toHaveAttribute('title', '7 de octubre de 2026, 6:24 p. m.');
    expect(date.parentElement).toHaveTextContent('Vence el');
  }
  expect(screen.getAllByRole('button', { name: /Reenviar invitación/ })).toHaveLength(2);
});
it('Profesional no monta ni expone fechas de invitaciones del equipo', () => {
  fixture.user.role = 'BARBER';
  const { container } = render(<TeamPage />);
  expect(screen.getByText('No tienes acceso a Equipo')).toBeInTheDocument();
  expect(container.querySelector('time')).toBeNull();
});
