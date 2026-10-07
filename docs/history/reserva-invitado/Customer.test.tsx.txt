import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { api, ApiError } from '@/lib/api';
import { CustomerProvider, useCustomer } from './CustomerProvider';
import { CustomerBookings } from './CustomerBookings';
import { CustomerProfile } from './CustomerProfile';
import { CustomerClaim } from './CustomerClaim';
import { CustomerAuth } from './CustomerAuth';
import { CustomerShell } from './CustomerShell';
import { CustomerEntryLinks } from './CustomerEntryLinks';

const qa = vi.hoisted(() => ({ userId: 'cliente-a' as string | null, sessionId: 'sesion-a', pathname: '/norte/mis-reservas', role: 'OWNER', organizationId: 'norte', getToken: vi.fn(), signOut: vi.fn(), replace: vi.fn(), push: vi.fn(), create: vi.fn(), prepare: vi.fn(), verify: vi.fn(), activate: vi.fn() }));
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: Boolean(qa.userId), userId: qa.userId, sessionId: qa.sessionId, getToken: qa.getToken, signOut: qa.signOut }) }));
vi.mock('@clerk/nextjs/legacy', () => ({ useSignUp: () => ({ isLoaded: true, signUp: { create: qa.create, prepareEmailAddressVerification: qa.prepare, attemptEmailAddressVerification: qa.verify }, setActive: qa.activate }), useSignIn: () => ({ isLoaded: true, signIn: { create: qa.create, prepareFirstFactor: qa.prepare, attemptFirstFactor: qa.verify }, setActive: qa.activate }) }));
vi.mock('next/navigation', () => ({ usePathname: () => qa.pathname, useRouter: () => ({ replace: qa.replace, push: qa.push }) }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: { role: qa.role }, organization: { id: qa.organizationId } }) }));
const id = '11111111-1111-4111-8111-111111111111';
const item = { id, startTime: '2099-10-05T14:00:00Z', endTime: '2099-10-05T14:30:00Z', status: 'PENDING', service: { id, name: 'Servicio sintético Norte' }, professional: { id, name: 'Profesional Norte' }, canBookAgain: true };
const page = { items: [item], nextCursor: null, asOf: '2026-10-03T14:00:00Z', business: { slug: 'norte', name: 'Negocio Norte', timeZone: 'America/Santo_Domingo' } };
function mount(children: React.ReactNode, slug = 'norte') { return render(<CustomerProvider slug={slug}>{children}</CustomerProvider>); }
beforeEach(() => {
  qa.userId = 'cliente-a'; qa.sessionId = 'sesion-a'; qa.role = 'OWNER'; qa.organizationId = 'norte'; qa.pathname = '/norte/mis-reservas';
  qa.getToken.mockReset().mockResolvedValue('synthetic-only'); qa.signOut.mockReset().mockResolvedValue(undefined); qa.replace.mockReset(); qa.push.mockReset();
  qa.create.mockReset().mockResolvedValue({ supportedFirstFactors: [{ strategy: 'email_code', emailAddressId: 'sintetico' }] }); qa.prepare.mockReset().mockResolvedValue({}); qa.verify.mockReset().mockResolvedValue({ status: 'complete', createdSessionId: 'sintetica' }); qa.activate.mockReset().mockResolvedValue(undefined);
  vi.spyOn(api, 'get').mockImplementation(async path => path === '/customer/businesses' ? { businesses: [{ slug: 'norte', name: 'Negocio Norte', canBook: true }] } : path.endsWith('/profile') ? { name: 'Cliente A sintético', phone: '+18095550111', email: 'cliente@test.invalid', canEditContact: true } : page);
});
it('lista del negocio con estado honesto, sin acciones etapa 2 ni precios históricos', async () => {
  mount(<CustomerBookings view="upcoming" />);
  expect(await screen.findByText('Servicio sintético Norte')).toBeVisible();
  expect(screen.getByText('Pendiente de confirmación')).toBeVisible();
  expect(screen.queryByRole('button', { name: /Cancelar|Reprogramar/ })).toBeNull();
  expect(screen.queryByText(/RD\$/)).toBeNull();
  const options = vi.mocked(api.get).mock.calls.find(call => call[0].endsWith('/bookings'))![2]!;
  expect(options.cache).toBe('no-store');
  expect(await options.authResolver!()).toEqual({ token: 'synthetic-only', organizationId: null });
});
it('cinco roles sin vínculo ven estado neutro y no obtienen reservas por su rol', async () => {
  vi.mocked(api.get).mockResolvedValue({ businesses: [] });
  for (const role of ['OWNER', 'ADMIN', 'RECEPTIONIST', 'BARBER', 'CUSTOMER']) {
    qa.role = role;
    const view = mount(<CustomerBookings view="upcoming" />);
    expect(await screen.findByText('Aún no has añadido reservas a tu cuenta en este negocio.')).toBeVisible();
    expect(screen.queryByText('Servicio sintético Norte')).toBeNull(); view.unmount();
  }
  expect(vi.mocked(api.get).mock.calls.every(call => call[0] === '/customer/businesses')).toBe(true);
});
it('cambio A → B → A aborta la primera visita e ignora una respuesta privada tardía', async () => {
  let finish!: (value: unknown) => void;
  vi.mocked(api.get).mockImplementation(async path => path.endsWith('/profile') ? new Promise(resolve => { finish = resolve; }) : page);
  function Private() { const session = useCustomer(); return <CustomerShell title="Privado"><span>{session.scope}</span><CustomerProfile /></CustomerShell>; }
  const view = mount(<Private />);
  await waitFor(() => expect(finish).toBeDefined());
  const oldOptions = vi.mocked(api.get).mock.calls[0][2]!;
  const late = finish;
  qa.userId = 'cliente-b'; qa.sessionId = 'sesion-b'; view.rerender(<CustomerProvider slug="norte"><Private /></CustomerProvider>);
  await act(async () => { await Promise.resolve(); });
  expect(oldOptions.signal!.aborted).toBe(true);
  qa.userId = 'cliente-a'; qa.sessionId = 'sesion-a'; view.rerender(<CustomerProvider slug="norte"><Private /></CustomerProvider>);
  await act(async () => { late({ name: 'PII vieja', phone: '123', email: 'vieja@test.invalid', canEditContact: true }); });
  expect(screen.queryByDisplayValue('PII vieja')).toBeNull();
});
it('cambio de negocio y de rol elimina el perfil anterior', async () => {
  const view = mount(<CustomerProfile />);
  await screen.findByDisplayValue('Cliente A sintético');
  vi.mocked(api.get).mockResolvedValue({ name: 'Cliente B sintético', phone: null, email: null, canEditContact: true });
  qa.role = 'BARBER'; qa.organizationId = 'sur'; qa.pathname = '/sur/mi-perfil';
  view.rerender(<CustomerProvider slug="sur"><CustomerProfile /></CustomerProvider>);
  expect(screen.queryByDisplayValue('Cliente A sintético')).toBeNull();
  expect(await screen.findByDisplayValue('Cliente B sintético')).toBeVisible();
});
it('PATCH con timeout reintenta idéntico cuerpo/clave, bloquea edición incierta y confirma después', async () => {
  vi.spyOn(api, 'patch').mockRejectedValueOnce(new ApiError(503, 'timeout')).mockResolvedValueOnce({ name: 'Nuevo', phone: null, email: 'cliente@test.invalid', canEditContact: true });
  mount(<CustomerProfile />);
  fireEvent.change(await screen.findByLabelText('Nombre'), { target: { value: 'Nuevo' } });
  fireEvent.change(screen.getByLabelText('Teléfono (opcional)'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar datos' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Reintentar el mismo envío' }));
  await screen.findByText('Tus datos se guardaron para este negocio.');
  const calls = vi.mocked(api.patch).mock.calls;
  expect(calls[0][1]).toEqual({ name: 'Nuevo', phone: null }); expect(calls[1][1]).toEqual(calls[0][1]);
  expect(calls[1][2]!.headers).toEqual(calls[0][2]!.headers);
  expect(calls[0][2]!.headers).toMatchObject({ 'Idempotency-Key': expect.stringMatching(/^[a-f0-9-]{36}$/) });
  expect(screen.getByLabelText('Correo de contacto')).toHaveAttribute('readonly');
});
it('resumen accesible enfoca errores de perfil y enlaza al campo', async () => {
  mount(<CustomerProfile />); fireEvent.change(await screen.findByLabelText('Nombre'), { target: { value: ' ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar datos' }));
  const summary = screen.getByRole('alert'); expect(summary).toHaveFocus();
  expect(screen.getByRole('link', { name: 'Escribe un nombre de hasta 120 caracteres.' })).toHaveAttribute('href', '#profile-name');
  expect(screen.getByLabelText('Nombre')).toHaveAccessibleDescription('Escribe un nombre de hasta 120 caracteres.');
});
it('claim solo anuncia visibilidad después de lectura autorizada y nunca autoejecuta', async () => {
  vi.spyOn(api, 'post').mockResolvedValue({ claimed: true });
  mount(<CustomerClaim bookingId={id} />); expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Añadir esta reserva a Mis reservas' }));
  expect(screen.getByText('Vincularás tu cuenta con tus reservas en este negocio.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Añadir reserva' }));
  await screen.findByText('La reserva ya aparece en Mis reservas.');
  expect(api.post).toHaveBeenCalledWith('/auth/clerk/customer/claims', { bookingId: id, organizationSlug: 'norte' }, expect.objectContaining({ cache: 'no-store' }));
});
it('claim exitoso + cuarentena 404 conserva reserva y propone asistencia sin revelar causa', async () => {
  vi.spyOn(api, 'post').mockResolvedValue({ claimed: true }); vi.mocked(api.get).mockRejectedValue(new ApiError(404, 'private cuarentena'));
  mount(<CustomerClaim bookingId={id} />); fireEvent.click(screen.getByRole('button', { name: 'Añadir esta reserva a Mis reservas' })); fireEvent.click(screen.getByRole('button', { name: 'Añadir reserva' }));
  await screen.findByText('Tu reserva sigue registrada. No pudimos mostrarla en Mis reservas para esta cuenta. Contacta al negocio para que revise tu caso.');
  expect(screen.queryByText('La reserva ya aparece en Mis reservas.')).toBeNull(); expect(document.body.textContent).not.toMatch(/cuarentena|private/);
});
it('logout fallido oculta datos privados y mantiene reintento sin anunciar salida', async () => {
  qa.signOut.mockRejectedValueOnce(new Error('provider private'));
  mount(<CustomerProfile />); await screen.findByDisplayValue('Cliente A sintético');
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  await screen.findByText('No pudimos cerrar la sesión. Inténtalo de nuevo.');
  expect(screen.queryByDisplayValue('Cliente A sintético')).toBeNull(); expect(qa.replace).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' })); await waitFor(() => expect(qa.replace).toHaveBeenCalledWith('/norte'));
});
it('alta recoge nombre/correo, verifica código por SDK y restringe retorno', async () => {
  qa.userId = null; mount(<CustomerAuth mode="create" next="https://evil.invalid" />);
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Cliente Sintético' } }); fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'cliente@test.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' })); await screen.findByLabelText('Código por correo');
  expect(qa.create).toHaveBeenCalledWith({ firstName: 'Cliente Sintético', emailAddress: 'cliente@test.invalid' });
  expect(qa.prepare).toHaveBeenCalledWith({ strategy: 'email_code' });
  fireEvent.change(screen.getByLabelText('Código por correo'), { target: { value: '123456' } }); fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }));
  await waitFor(() => expect(qa.replace).toHaveBeenCalledWith('/norte/mis-reservas'));
});
it('mini-sitio mantiene cuentas secundarias y separadas del alta B2B', () => {
  qa.userId = null; render(<CustomerEntryLinks slug="norte" />);
  expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/norte/cuenta/crear'); expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/norte/cuenta/entrar');
});
it('alta omite enlace a sí misma y mantiene entrada y recuperación útiles', () => {
  qa.userId = null; mount(<CustomerAuth mode="create" next={null} />);
  expect(screen.queryByRole('link', { name: 'Crear cuenta' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/norte/cuenta/entrar');
  expect(screen.getByRole('link', { name: 'Recuperar acceso' })).toHaveAttribute('href', '/norte/cuenta/recuperar');
});
it('pestañas anuncian selección y permiten flechas, Inicio, Fin y activación', async () => {
  mount(<CustomerBookings view="upcoming" />);
  const upcoming = await screen.findByRole('tab', { name: 'Próximas' });
  const history = screen.getByRole('tab', { name: 'Historial' });
  expect(upcoming).toHaveAttribute('aria-selected', 'true'); expect(history).toHaveAttribute('aria-selected', 'false');
  expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', upcoming.id);
  upcoming.focus(); fireEvent.keyDown(upcoming, { key: 'ArrowRight' }); expect(history).toHaveFocus();
  expect(qa.push).not.toHaveBeenCalled();
  fireEvent.keyDown(history, { key: 'Home' }); expect(upcoming).toHaveFocus();
  fireEvent.keyDown(upcoming, { key: 'End' }); expect(history).toHaveFocus();
  fireEvent.click(history); expect(qa.push).toHaveBeenCalledWith('/norte/mis-reservas?vista=historial', { scroll: false });
});
it('paginación con cursor obsoleto oculta todas las páginas y reinicia sin cursor', async () => {
  vi.mocked(api.get).mockImplementation(async (path, params) => {
    if (path === '/customer/businesses') return { businesses: [{ slug: 'norte', name: 'Negocio Norte', canBook: true }] };
    if (params?.cursor) throw new ApiError(409, 'Tus reservas cambiaron');
    return { ...page, nextCursor: 'opaque-synthetic' };
  });
  mount(<CustomerBookings view="upcoming" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Ver más' }));
  await screen.findByText('Tus reservas cambiaron o la consulta venció. Actualiza la lista para continuar.');
  expect(screen.queryByText(item.service.name)).toBeNull();
  fireEvent.click(screen.getAllByRole('button', { name: 'Actualizar lista' }).at(-1)!);
  await screen.findByText(item.service.name);
  expect(vi.mocked(api.get).mock.calls.filter(call => call[0].endsWith('/bookings')).at(-1)![1]).not.toHaveProperty('cursor');
});
it('429 usa espera del contrato e impide reintento y refresco automático durante la ventana', async () => {
  vi.mocked(api.get).mockImplementation(async path => {
    if (path === '/customer/businesses') return { businesses: [{ slug: 'norte', name: 'Negocio Norte', canBook: true }] };
    throw new ApiError(429, 'private', 37);
  });
  mount(<CustomerBookings view="upcoming" />);
  expect(await screen.findByText('Puedes volver a consultar en 37 segundos.')).toBeVisible();
  const count = vi.mocked(api.get).mock.calls.length;
  fireEvent(window, new Event('focus'));
  expect(screen.getAllByRole('button', { name: 'Actualizar lista' }).every(button => button.hasAttribute('disabled'))).toBe(true);
  expect(vi.mocked(api.get).mock.calls).toHaveLength(count);
});
it('recuperación usa código de correo y errores neutros, sin buscar identidad en el API', async () => {
  qa.userId = null; qa.create.mockRejectedValueOnce(new Error('email_exists PII'));
  mount(<CustomerAuth mode="recover" next={null} />);
  fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'cuenta@test.invalid' } }); fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
  await screen.findByText('No pudimos continuar. Revisa tus datos e inténtalo de nuevo o solicita asistencia.');
  expect(api.get).not.toHaveBeenCalled(); expect(document.body.textContent).not.toMatch(/email_exists|PII/);
});
it('perfil incierto conserva comando al volver de otra app y refrescar el permiso', async () => {
  vi.spyOn(api, 'patch').mockRejectedValueOnce(new ApiError(503, 'timeout')).mockResolvedValueOnce({ name: 'Nuevo', phone: '+18095550111', email: 'cliente@test.invalid', canEditContact: true });
  mount(<CustomerProfile />); fireEvent.change(await screen.findByLabelText('Nombre'), { target: { value: 'Nuevo' } }); fireEvent.click(screen.getByRole('button', { name: 'Guardar datos' }));
  await screen.findByRole('button', { name: 'Reintentar el mismo envío' });
  fireEvent(window, new Event('focus'));
  fireEvent.click(await screen.findByRole('button', { name: 'Reintentar el mismo envío' }));
  await screen.findByText('Tus datos se guardaron para este negocio.');
  const calls = vi.mocked(api.patch).mock.calls; expect(calls[1][1]).toEqual(calls[0][1]); expect(calls[1][2]!.headers).toEqual(calls[0][2]!.headers);
});
