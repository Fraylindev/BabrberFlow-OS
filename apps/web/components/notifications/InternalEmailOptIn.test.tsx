import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/lib/api';
import { EMAIL_NOTICE_TEXT } from '@/lib/notification-ui';
import BookingsPage from '@/app/dashboard/bookings/page';

const qa = vi.hoisted(() => ({
  user: { id: 'actor', organizationId: 'north', role: 'OWNER', name: 'QA' } as AuthUser,
  create: vi.fn(), toast: vi.fn(),
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: qa.user }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: qa.toast }) }));
vi.mock('@/lib/queries/invoices', () => ({ useCreateInvoice: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/lib/queries/bookings', () => ({
  useBookingsQuery: () => ({ data: [], isLoading: false, isError: false }),
  useCreateBooking: () => ({ mutateAsync: qa.create, isPending: false }),
  useUpdateBookingStatus: () => ({ mutateAsync: vi.fn() }),
  useRescheduleBooking: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/lib/queries/clients', () => ({ useClientsQuery: () => ({ data: [
  { id: 'client-a', name: 'Cliente Uno', phone: '8095550101' },
  { id: 'client-b', name: 'Cliente Dos', phone: '8095550102' },
] }) }));
vi.mock('@/lib/queries/professionals', () => ({ useProfessionalsQuery: () => ({ data: [{ id: 'professional', name: 'Profesional QA', isActive: true }] }) }));
vi.mock('@/lib/queries/services', () => ({ useServicesQuery: () => ({ data: [{ id: 'service', name: 'Corte', duration: 30, isActive: true }] }) }));
// The existing date picker has its own coverage; this boundary supplies its selected instant.
vi.mock('@/components/ui/DateTimePicker', () => ({ DateTimePicker: ({ onChange }: { onChange: (value: string) => void }) =>
  <button type="button" onClick={() => onChange('2099-01-05T14:00:00.000Z')}>Elegir horario QA</button> }));

beforeEach(() => {
  qa.user = { id: 'actor', organizationId: 'north', role: 'OWNER', name: 'QA' };
  qa.create.mockReset().mockResolvedValue({ id: 'created' });
  qa.toast.mockReset();
});
function open() {
  const view = render(<BookingsPage />);
  fireEvent.click(screen.getAllByRole('button', { name: '+ Nueva reserva' })[0]);
  return view;
}
function chooseClient(name: string) {
  fireEvent.change(screen.getByRole('combobox', { name: /Cliente/ }), { target: { value: name } });
  fireEvent.mouseDown(screen.getByRole('option', { name: new RegExp(name) }));
}
function details() {
  chooseClient('Cliente Uno');
  fireEvent.change(screen.getByRole('combobox', { name: 'Profesional' }), { target: { value: 'professional' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Servicio' }), { target: { value: 'service' } });
  fireEvent.click(screen.getByRole('button', { name: 'Elegir horario QA' }));
}
function consent() {
  fireEvent.click(screen.getByLabelText(EMAIL_NOTICE_TEXT));
  fireEvent.change(screen.getByLabelText('Correo revisado con el cliente'), { target: { value: 'avisos@example.test' } });
  fireEvent.click(screen.getByLabelText('El cliente eligió recibir estos avisos y revisé con él su correo registrado.'));
}
it('records no consent by default and requires explicit contact review for opted-in creation', async () => {
  open(); details();
  expect(screen.getByLabelText(EMAIL_NOTICE_TEXT)).not.toBeChecked();
  fireEvent.click(screen.getByLabelText(EMAIL_NOTICE_TEXT));
  fireEvent.change(screen.getByLabelText('Correo revisado con el cliente'), { target: { value: 'avisos@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));
  expect(qa.create).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('confirma su elección');
  fireEvent.click(screen.getByLabelText('El cliente eligió recibir estos avisos y revisé con él su correo registrado.'));
  fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));
  await waitFor(() => expect(qa.create).toHaveBeenCalledWith({ clientId: 'client-a', professionalId: 'professional', serviceId: 'service',
    startTime: '2099-01-05T14:00:00.000Z', emailNotifications: { optedIn: true, noticeVersion: 'booking-email-v1', reviewedEmail: 'avisos@example.test' } }));
});
it('changing the client clears the earlier choice and contact review', async () => {
  open(); details(); consent();
  fireEvent.click(screen.getByRole('button', { name: /Cliente \(obligatorio\)/i }));
  chooseClient('Cliente Dos');
  expect(screen.getByLabelText(EMAIL_NOTICE_TEXT)).not.toBeChecked();
  expect(screen.queryByLabelText('Correo revisado con el cliente')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));
  await waitFor(() => expect(qa.create).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'client-b',
    emailNotifications: { optedIn: false, noticeVersion: 'booking-email-v1' } })));
});
it('BARBER creation never adds the email extension', async () => {
  qa.user.role = 'BARBER';
  open(); details();
  expect(screen.queryByLabelText(EMAIL_NOTICE_TEXT)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));
  await waitFor(() => expect(qa.create).toHaveBeenCalledTimes(1));
  expect(qa.create.mock.calls[0][0]).not.toHaveProperty('emailNotifications');
});
it('discards a late creation callback after leaving and returning to the tenant', async () => {
  let complete!: (value: unknown) => void;
  qa.create.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
  const { rerender } = open(); details(); consent();
  fireEvent.click(screen.getByRole('button', { name: 'Reservar' }));
  qa.user = { ...qa.user, organizationId: 'south' };
  rerender(<BookingsPage />);
  qa.user = { ...qa.user, organizationId: 'north' };
  rerender(<BookingsPage />);
  await act(async () => complete({ id: 'old-visit' }));
  expect(qa.toast).not.toHaveBeenCalled();
  expect(screen.getByLabelText(EMAIL_NOTICE_TEXT)).not.toBeChecked();
});
