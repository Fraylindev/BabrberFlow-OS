import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { api, ApiError, type PublicBookingData, type PublicBookingResult } from '@/lib/api';
import { PublicBookingFlow, PublicBookingScreen } from './PublicBookingScreen';
import { ACCOUNT_QA_NOTICE, CONTACT_REJECTION, UNCERTAIN_BOOKING } from '@/lib/public-booking-ui';

const qa = vi.hoisted(() => ({ user: { id: 'owner', role: 'OWNER' }, organization: { id: 'north' } }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => qa }));
vi.mock('@/lib/queries/media', () => ({ usePublicMedia: () => ({ data: null, isError: false, refetch: vi.fn() }) }));

const startTime = '2026-10-05T14:00:00.000Z';
const slot = { time: '10:00', startTime, professionalId: 'alex' };
const data: PublicBookingData = {
  minimumBookingDate: '2026-10-01', timeZone: 'America/Santo_Domingo',
  organization: { name: 'Estudio sintético', slug: 'north', phone: null, description: null, address: null, googleMapsUrl: null },
  services: [{ id: 'cut', name: 'Corte QA', description: null, duration: 30, price: '500.00' }, { id: 'long', name: 'Servicio largo QA', description: null, duration: 120, price: '1000.00' }],
  professionals: [{ id: 'alex', name: 'Alex QA', bio: null, avatar: null }, { id: 'other', name: 'Otro QA', bio: null, avatar: null }],
};
const result: PublicBookingResult = { booking: { id: 'private', serviceId: 'cut', professionalId: 'alex', startTime, endTime: '2026-10-05T14:30:00.000Z', status: 'PENDING' }, accountCreated: false, accountCreationError: null };
function mount(scoped = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = (slug: string) => <QueryClientProvider client={client}>{scoped ? <PublicBookingScreen slug={slug} /> : <PublicBookingFlow key={slug} slug={slug} />}</QueryClientProvider>;
  return { ...render(view('north')), view, client };
}
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  qa.user = { id: 'owner', role: 'OWNER' }; qa.organization = { id: 'north' };
  vi.spyOn(api, 'get').mockImplementation(async path => path.includes('availability-days')
    ? { from: '2026-10-01', to: '2026-10-31', serviceId: 'cut', availableDates: ['2026-10-05'] }
    : path.includes('availability?') ? { date: '2026-10-05', serviceId: 'cut', slots: [slot] } : data);
  vi.spyOn(api, 'post').mockResolvedValue(result);
});
afterEach(() => focusManager.setFocused(undefined));

async function reachContact(any = true) {
  fireEvent.click(await screen.findByRole('button', { name: /Corte QA/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Elegir profesional' }));
  fireEvent.click(screen.getByRole('button', { name: any ? /Sin preferencia/ : /Alex QA/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Ver fechas y horas' }));
  fireEvent.click(await screen.findByRole('button', { name: '5 de octubre de 2026' }));
  fireEvent.click(await screen.findByRole('button', { name: '10:00 a. m.' }));
  expect(screen.getByText('Te atenderá Alex QA')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Continuar con tus datos' }));
  await screen.findByRole('heading', { name: 'Tus datos' });
}
function fillContact(email = '') {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Visitante sintético' } });
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '+34 (912) 345-678' } });
  if (email) fireEvent.change(screen.getByLabelText('Correo (opcional)'), { target: { value: email } });
}
async function review() { fireEvent.click(screen.getByRole('button', { name: 'Revisar reserva' })); await screen.findByRole('heading', { name: 'Revisa tu reserva' }); }

it('consume rango real, deshabilita días y no ofrece hora libre ni preseleccionada', async () => {
  mount(); await reachContact();
  fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
  expect(await screen.findByRole('button', { name: '6 de octubre de 2026, sin horarios disponibles' })).toBeDisabled();
  expect(screen.getByRole('group', { name: 'Horas disponibles' })).toBeVisible();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  const calls = vi.mocked(api.get).mock.calls.map(call => call[0]);
  expect(calls.some(path => path.includes('availability-days?') && path.includes('from=2026-10-01') && !path.includes('professionalId'))).toBe(true);
});
it('invitado registra el instante/candidato, solo una vez, sin contraseña ni zona', async () => {
  mount(); await reachContact(); fillContact(); await review();
  const button = screen.getByRole('button', { name: 'Registrar reserva' }); fireEvent.click(button); fireEvent.click(button);
  await screen.findByText('Tu reserva quedó registrada');
  expect(screen.getByText('Pendiente de confirmación')).toBeVisible();
  expect(api.post).toHaveBeenCalledTimes(1);
  const payload = vi.mocked(api.post).mock.calls[0][1];
  expect(payload).toMatchObject({ professionalId: 'alex', startTime, clientPhone: '+34912345678', createAccount: false });
  expect(payload).not.toHaveProperty('password'); expect(payload).not.toHaveProperty('timeZone');
  expect(document.body.textContent).not.toMatch(/Visitante sintético|912|PENDING|UTC/);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Tu reserva quedó registrada' })).toHaveFocus());
});
it('correo/teléfono/password inválidos se explican antes de revisar; cuenta QA opcional y contraseña eliminada al desmarcar', async () => {
  mount(); await reachContact();
  expect(screen.getByText(ACCOUNT_QA_NOTICE)).toBeVisible();
  expect(screen.getByRole('checkbox', { name: 'Crear cuenta de prueba' })).not.toBeChecked();
  fillContact('invalid'); fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar reserva' }));
  expect(screen.getByLabelText('Teléfono')).toHaveFocus();
  expect(screen.getByLabelText('Correo (opcional)')).toHaveAccessibleDescription('Revisa el correo.');
  fillContact('sintetico@example.test');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Crear cuenta de prueba' }));
  fireEvent.change(screen.getByLabelText('Crea una contraseña'), { target: { value: '1234567' } });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar reserva' }));
  expect(screen.getByLabelText('Crea una contraseña')).toHaveAccessibleDescription(/8 caracteres/);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Crear cuenta de prueba' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Crear cuenta de prueba' }));
  expect(screen.getByLabelText('Crea una contraseña')).toHaveValue('');
  expect(api.post).not.toHaveBeenCalled();
});
it('D11 vuelve a datos conservando todo el borrador y sin revelar existencia ni constraints', async () => {
  vi.mocked(api.post).mockRejectedValueOnce(new ApiError(400, 'EMAIL_ALREADY_EXISTS private Prisma'));
  mount(); await reachContact(); fillContact('sintetico@example.test'); await review();
  fireEvent.click(screen.getByRole('button', { name: 'Registrar reserva' }));
  await screen.findByText(CONTACT_REJECTION);
  expect(screen.getByLabelText('Nombre')).toHaveValue('Visitante sintético');
  expect(screen.getByLabelText('Teléfono')).toHaveValue('912345678');
  expect(screen.getByLabelText('Correo (opcional)')).toHaveValue('sintetico@example.test');
  expect(document.body.textContent).not.toMatch(/Prisma|EMAIL_ALREADY_EXISTS/);
});
it.each([404, 409])('rechazo %s retira la página o exige otra hora sin repetir el envío', async status => {
  vi.mocked(api.post).mockRejectedValueOnce(new ApiError(status, 'detalle privado'));
  mount(); await reachContact(false); fillContact(); await review();
  fireEvent.click(screen.getByRole('button', { name: 'Registrar reserva' }));
  if (status === 404) {
    await screen.findByRole('heading', { name: 'Esta página no está disponible' });
    expect(screen.queryByLabelText('Teléfono')).not.toBeInTheDocument();
  } else {
    await screen.findByRole('heading', { name: 'Elige fecha y hora' });
    expect(screen.getByText('Ese horario ya no está disponible. Elige otra hora.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continuar con tus datos' })).toBeDisabled();
  }
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(document.body.textContent).not.toContain('detalle privado');
});
it('timeout/5xx terminal no ofrece reenvío y solo permite regreso al negocio', async () => {
  vi.mocked(api.post).mockRejectedValueOnce(new ApiError(503, 'timeout'));
  mount(); await reachContact(); fillContact(); await review(); fireEvent.click(screen.getByRole('button', { name: 'Registrar reserva' }));
  await screen.findByText(UNCERTAIN_BOOKING);
  expect(screen.queryByRole('button', { name: /Registrar|Reintentar/ })).not.toBeInTheDocument();
  expect(api.post).toHaveBeenCalledTimes(1);
});
it('un profesional único salta el clic vacío y muestra la selección', async () => {
  vi.mocked(api.get).mockResolvedValue({ ...data, professionals: data.professionals.slice(0, 1) });
  mount(); fireEvent.click(await screen.findByRole('button', { name: /Corte QA/ })); fireEvent.click(screen.getByRole('button', { name: 'Elegir profesional' }));
  expect(screen.getByText('Paso 3 de 5 · Fecha y hora')).toBeVisible();
  expect(screen.getByText('Profesional seleccionado: Alex QA')).toBeVisible();
});
it('cambio de usuario, rol u organización descarta el borrador incluso A → B → A', async () => {
  const { rerender, view } = mount(true); await reachContact(); fillContact();
  qa.user = { id: 'other', role: 'BARBER' }; qa.organization = { id: 'south' }; rerender(view('north'));
  await screen.findByRole('heading', { name: 'Selecciona el servicio' });
  qa.user = { id: 'owner', role: 'OWNER' }; qa.organization = { id: 'north' }; rerender(view('north'));
  await reachContact(); expect(screen.getByLabelText('Nombre')).toHaveValue(''); expect(api.post).not.toHaveBeenCalled();
});
it('ignora un POST tardío al salir y volver al mismo slug', async () => {
  const open = vi.spyOn(window, 'open');
  let finish!: (value: PublicBookingResult) => void;
  vi.mocked(api.post).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { rerender, view } = mount(); await reachContact(); fillContact(); await review(); fireEvent.click(screen.getByRole('button', { name: 'Registrar reserva' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  rerender(view('south')); await screen.findByRole('heading', { name: 'Selecciona el servicio' });
  rerender(view('north')); await screen.findByRole('heading', { name: 'Selecciona el servicio' });
  await act(async () => finish(result)); expect(screen.queryByText('Tu reserva quedó registrada')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Abrir WhatsApp/ })).not.toBeInTheDocument();
  expect(open).not.toHaveBeenCalled();
});

it('revisión y éxito usan la zona del negocio y reenvían el mismo instante, incluso en otro día del dispositivo', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-04T16:00:00Z'));
  const instant = '2026-10-05T01:00:00.000Z';
  vi.mocked(api.get).mockImplementation(async path => path.includes('availability-days')
    ? { from: '2026-10-05', to: '2026-10-31', serviceId: 'cut', availableDates: ['2026-10-05'] }
    : path.includes('availability?') ? { date: '2026-10-05', serviceId: 'cut', slots: [{ ...slot, startTime: instant }] }
      : { ...data, minimumBookingDate: '2026-10-05', timeZone: 'Asia/Tokyo' });
  vi.mocked(api.post).mockResolvedValue({ ...result, booking: { ...result.booking, startTime: instant, endTime: '2026-10-05T01:30:00.000Z' } });
  mount(); await reachContact(true); fillContact(); await review();
  expect(screen.getByText('Hoy, 10:00 a. m.')).toHaveAttribute('datetime', instant);
  fireEvent.click(screen.getByRole('button', { name: 'Registrar reserva' }));
  await screen.findByText('Tu reserva quedó registrada');
  expect(screen.getByText('Hoy, 10:00 a. m.')).toHaveAttribute('title', '5 de octubre de 2026, 10:00 a. m.');
  expect(vi.mocked(api.post).mock.calls[0][1]).toMatchObject({ startTime: instant });
  expect(vi.mocked(api.post).mock.calls[0][1]).not.toHaveProperty('timeZone');
  expect(document.body.textContent).not.toMatch(/Asia|UTC|GMT/);
});

it('429 conserva datos, permite corregirlos y espera el plazo sin repetir el POST', async () => {
  vi.mocked(api.post).mockRejectedValueOnce(new ApiError(429, 'limit', 2));
  mount(); await reachContact(); fillContact('sintetico@example.test'); await review();
  fireEvent.click(screen.getByRole('button', { name: 'Registrar reserva' }));
  await screen.findByText('Has hecho varios intentos. Espera un momento antes de continuar.');
  expect(screen.getByRole('button', { name: 'Espera un momento' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Editar datos' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Editar datos' }));
  expect(screen.getByLabelText('Nombre')).toHaveValue('Visitante sintético');
  expect(screen.getByLabelText('Correo (opcional)')).toHaveValue('sintetico@example.test');
  expect(api.post).toHaveBeenCalledTimes(1);
});

it('un candidato que falta en el catálogo exige revisar profesional antes de avanzar', async () => {
  vi.mocked(api.get).mockImplementation(async path => path.includes('availability-days')
    ? { from: '2026-10-01', to: '2026-10-31', serviceId: 'cut', availableDates: ['2026-10-05'] }
    : path.includes('availability?') ? { date: '2026-10-05', serviceId: 'cut', slots: [{ ...slot, professionalId: 'nuevo' }] } : data);
  mount(); fireEvent.click(await screen.findByRole('button', { name: /Corte QA/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Elegir profesional' }));
  fireEvent.click(screen.getByRole('button', { name: /Sin preferencia/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Ver fechas y horas' }));
  fireEvent.click(await screen.findByRole('button', { name: '5 de octubre de 2026' }));
  fireEvent.click(await screen.findByRole('button', { name: '10:00 a. m.' }));
  expect(screen.getByRole('heading', { name: 'Elige un profesional' })).toBeVisible();
  expect(screen.getByText('Las opciones cambiaron. Vuelve a elegir profesional.')).toBeVisible();
  expect(api.post).not.toHaveBeenCalled();
});
