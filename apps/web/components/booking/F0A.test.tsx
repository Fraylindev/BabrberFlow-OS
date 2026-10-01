import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountStep } from '@/app/[slug]/_components/AccountStep';
import { SuccessView } from '@/app/[slug]/_components/SuccessView';
import { ApiError, type PublicBookingResult } from '@/lib/api';
import { TEAM_ROLE_LABELS, TEAM_ROLE_OPTIONS } from '@/lib/team-ui';
import BookingsPage from '@/app/dashboard/bookings/page';
import InvoicesPage from '@/app/dashboard/invoices/page';
import { PasswordField } from '@/components/ui/PasswordField';
import { ErrorText } from '@/components/ui/ErrorText';

afterEach(() => vi.unstubAllGlobals());

const qa = vi.hoisted(() => ({
  failure: null as Error | null,
  toast: vi.fn(),
  mutate: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: { id: 'qa', role: 'OWNER', organizationId: 'qa-org' } }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: qa.toast }) }));
vi.mock('@/lib/queries/bookings', () => ({
  useBookingsQuery: () => ({ data: [{ id: 'qa-booking', status: 'CONFIRMED', startTime: '2099-01-05T14:00:00Z', endTime: '2099-01-05T14:30:00Z', client: { name: 'Cliente sintético' }, service: { name: 'Servicio sintético' }, professional: { name: 'Profesional sintético' } }], refetch: vi.fn() }),
  useUpdateBookingStatus: () => ({ mutateAsync: qa.mutate }),
  useCreateBooking: () => ({}), useRescheduleBooking: () => ({}),
}));
vi.mock('@/lib/queries/invoices', () => ({
  useOrganizationTimeZoneQuery: () => ({ data: 'America/Santo_Domingo' }),
  useCreateInvoice: () => ({}),
  useInvoicesQuery: () => ({ data: { items: [], pagination: {} } }),
  useRecordInvoicePayment: () => ({}),
}));

const result: PublicBookingResult = {
  booking: { id: 'qa', serviceId: 'qa', professionalId: 'qa', startTime: '2099-01-05T14:00:00Z', endTime: '2099-01-05T14:30:00Z', status: 'PENDING' },
  accountCreated: false, accountCreationError: null,
};

describe('F0-A: regresiones de comportamiento', () => {
  it('asocia el error cuando el campo deriva su identificador de una etiqueta con espacios', () => {
    render(<PasswordField label="Contraseña de cuenta" error="Usa al menos ocho caracteres." />);
    expect(screen.getByLabelText('Contraseña de cuenta')).toHaveAccessibleDescription('Usa al menos ocho caracteres.');
  });
  it.each(['123456', '1234567'])('no avanza con %s y explica el mínimo junto al campo', (password) => {
    const next = vi.fn();
    render(<AccountStep clientEmail="sintetico@example.test" createAccount password={password} onToggle={vi.fn()} onPasswordChange={vi.fn()} onBack={vi.fn()} onNext={next} />);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    expect(screen.getByLabelText('Crea una contraseña')).toHaveAccessibleDescription(/8 caracteres/);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(next).not.toHaveBeenCalled();
  });
  it('permite ocho caracteres y conserva visible la opción de cuenta', () => {
    render(<AccountStep clientEmail="sintetico@example.test" createAccount password="12345678" onToggle={vi.fn()} onPasswordChange={vi.fn()} onBack={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: /Crear cuenta/ })).toBeChecked();
  });
  it('muestra el instante autoritativo en la zona del negocio, sin convertirlo al dispositivo', () => {
    render(<SuccessView result={result} organizationPhone={null} serviceName="Servicio" professionalName="Profesional" timeZone="America/Santo_Domingo" />);
    const date = screen.getByText('5 ene 2099, 10:00 a. m.');
    expect(date.tagName).toBe('TIME');
    expect(date).toHaveAttribute('title', '5 de enero de 2099, 10:00 a. m.');
    expect(date).toHaveAttribute('datetime', new Date(result.booking.startTime).toISOString());
    expect(screen.queryByText(/2099-01-05|UTC|America\//)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('registrada');
  });
  it.each([BookingsPage, InvoicesPage])('conserva filtros nativos etiquetados sin ejemplos redundantes', (Page) => {
    render(<Page />);
    expect(screen.getByLabelText('Desde')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Hasta')).toHaveAttribute('type', 'date');
    expect(screen.queryByText(/Inicio del rango|Final del rango|Ejemplo:/)).not.toBeInTheDocument();
  });
  it('un fallo de transición se explica como transición sin código de soporte', async () => {
    // La propiedad existe en respuestas del servidor; la asignación permite ejecutar la regresión sobre la base anterior.
    const failure = new ApiError(400, 'Transición administrativa de estado no permitida');
    Object.assign(failure, { requestId: '12345678-1234-4234-8234-123456789abc' });
    qa.mutate.mockRejectedValueOnce(failure);
    render(<BookingsPage />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Completar' })[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent(/cambio de estado|transición/i);
    expect(screen.getByRole('alert')).not.toHaveTextContent('Código de soporte');
    expect(screen.queryByRole('button', { name: 'Copiar código de soporte' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).not.toHaveTextContent(/esa hora se repite/);
  });
  it('muestra el código de un error inesperado y copia solo su UUID', async () => {
    const id = '12345678-1234-4234-8234-123456789abc';
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', Object.create(navigator, { clipboard: { value: { writeText } } }));
    render(<ErrorText message={new ApiError(503, 'raw', null, id).withRequestCode('No pudimos cargar el perfil.')} />);
    expect(screen.getByText(`Código de soporte: ${id}`)).toHaveClass('truncate');
    const button = screen.getByRole('button', { name: 'Copiar código de soporte' });
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(id));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copiado'));
  });
  it('no presenta código ni botón en validaciones esperadas o cuando el API no emitió UUID', () => {
    for (const error of [new ApiError(400, 'Contraseña corta', null, '12345678-1234-4234-8234-123456789abc'), new ApiError(503, 'raw')]) {
      const view = render(<ErrorText message={error.withRequestCode('Revisa los datos.')} />);
      expect(screen.queryByText(/Código de soporte/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Copiar código de soporte' })).not.toBeInTheDocument();
      view.unmount();
    }
  });
  it('muestra Profesional en opciones y etiquetas sin cambiar el valor interno', () => {
    expect(TEAM_ROLE_LABELS.BARBER).toBe('Profesional');
    expect(TEAM_ROLE_OPTIONS.find((item) => item.value === 'BARBER')?.label).toBe('Profesional');
  });
});
