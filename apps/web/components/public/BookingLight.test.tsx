import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DateTimeStep } from '@/app/[slug]/_components/DateTimeStep';
import { SuccessView } from '@/app/[slug]/_components/SuccessView';
import { AvailabilityPicker } from '@/components/booking/AvailabilityPicker';
import { PhoneField } from './PhoneField';
import { EMPTY_PHONE, phoneValue, type PhoneDraft } from '@/lib/public-phone';
import { api, type PublicAvailabilitySlot } from '@/lib/api';

it('calendario genera una descarga TENTATIVE con instantes del servidor y sin datos de contacto', async () => {
  const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
  const create = vi.fn<(blob: Blob) => string>(() => 'blob:calendar-test');
  const revoke = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
  try {
    render(<SuccessView result={{ booking: { id: 'private-id', serviceId: 'service', professionalId: 'alex', startTime: '2026-10-03T03:30:00Z', endTime: '2026-10-03T04:00:00Z', status: 'PENDING' } }} organizationPhone={null} timeZone="America/Santo_Domingo" serviceName="Corte QA" returnHref="/north" />);
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar al calendario' }));
    expect(click).toHaveBeenCalledOnce();
    const anchor: unknown = click.mock.contexts[0];
    if (!(anchor instanceof HTMLAnchorElement)) throw new Error('Descarga sin enlace');
    expect(anchor.download).toBe('cita-pendiente.ics');
    expect(anchor.href).toBe('blob:calendar-test');
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith('blob:calendar-test');
    vi.useRealTimers();
    const blob = create.mock.calls[0][0] as Blob;
    const text = await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob); });
    expect(text).toContain('STATUS:TENTATIVE');
    expect(text).toContain('DTSTART:20261003T033000Z');
    expect(text).toContain('DTEND:20261003T040000Z');
    expect(text).toContain('DESCRIPTION:Reserva pendiente de confirmación por el negocio');
    expect(text).not.toContain('private-id');
  } finally {
    vi.useRealTimers();
    if (createDescriptor) Object.defineProperty(URL, 'createObjectURL', createDescriptor); else Reflect.deleteProperty(URL, 'createObjectURL');
    if (revokeDescriptor) Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor); else Reflect.deleteProperty(URL, 'revokeObjectURL');
  }
});

it('un rango fallido se muestra como error y reintento, sin habilitar días ni ocultarlo como vacío', async () => {
  vi.spyOn(api, 'get').mockRejectedValueOnce(new Error('fallo controlado')).mockResolvedValue({ availableDates: ['2026-10-02'] });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <DateTimeStep slug="north" serviceId="service" professionalId="alex" minimumBookingDate="2026-10-01" date="" onDateChange={vi.fn()} onSlotSelect={vi.fn()} onBack={vi.fn()} onNext={vi.fn()} />
  </QueryClientProvider>);
  await screen.findByRole('alert');
  expect(screen.queryByText(/No hay horarios disponibles/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '2 de octubre de 2026, disponibilidad sin comprobar' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar días' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '2 de octubre de 2026' })).toBeEnabled());
});

it('semana entre meses consulta siete días reales y escoger desde el mes lo cierra', async () => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(api, 'get').mockImplementation(async path => {
    const params = new URL(`http://test${path}`).searchParams;
    if (path.includes('availability-days')) return { from: params.get('from'), to: params.get('to'), availableDates: ['2026-10-29', '2026-11-02', '2026-11-06'], serviceId: 'service' };
    return { date: params.get('date'), serviceId: 'service', slots: [{ startTime: '2026-11-02T14:00:00Z', professionalId: 'alex', time: '10:00' }] };
  });
  function Flow() {
    const [date, setDate] = useState('');
    const [slot, setSlot] = useState<PublicAvailabilitySlot | null>(null);
    return <DateTimeStep slug="north" serviceId="service" professionalId="" minimumBookingDate="2026-10-29" date={date} onDateChange={setDate}
      selectedStartTime={slot?.startTime} onSlotSelect={setSlot} onBack={vi.fn()} onNext={vi.fn()} />;
  }
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Flow /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: '2 de noviembre de 2026' }));
  fireEvent.click(await screen.findByRole('button', { name: '10:00 a. m.' }));
  expect(screen.getByRole('button', { name: 'Continuar con tus datos' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Ver calendario' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Cerrar calendario' })).toHaveAttribute('aria-expanded', 'true'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar calendario' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar con tus datos' })).toBeEnabled());
  expect(screen.getByRole('button', { name: '10:00 a. m.' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Ver calendario' }));
  fireEvent.click(await screen.findByRole('button', { name: '6 de noviembre de 2026' }));
  expect(screen.getByRole('button', { name: 'Ver calendario' })).toHaveAttribute('aria-expanded', 'false');
  await waitFor(() => expect(vi.mocked(api.get).mock.calls.some(([path]) => path.includes('from=2026-11-06') && path.includes('to=2026-11-12'))).toBe(true));
  expect(vi.mocked(api.get).mock.calls.some(([path]) => path.includes('from=2026-10-29') && path.includes('to=2026-11-04'))).toBe(true);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Siete días anteriores' })).toBeEnabled());
  await waitFor(() => expect(screen.getByRole('button', { name: '6 de noviembre de 2026' })).toHaveFocus());
  fireEvent.click(screen.getByRole('button', { name: 'Siete días anteriores' }));
  await waitFor(() => expect(vi.mocked(api.get).mock.calls.some(([path]) => path.includes('from=2026-10-30') && path.includes('to=2026-11-05'))).toBe(true));
});

const pickerProps = { month: '2026-10', weekStart: '2026-10-01', minimumDate: '2026-10-01', date: '2026-10-02', availableDates: ['2026-10-02'], selectedStartTime: '',
  daysPending: false, slotsPending: false, calendarOpen: false, onMonthChange: vi.fn(), onWeekChange: vi.fn(), onToggleCalendar: vi.fn(), onDateChange: vi.fn(), onRetryDays: vi.fn(), onRetrySlots: vi.fn() };
const slots = Array.from({ length: 16 }, (_, index) => ({ time: `${String(index + 8).padStart(2, '0')}:00`, startTime: `2026-10-02T${String(index).padStart(2, '0')}:00:00Z`, professionalId: 'alex' }));
it('horas filtran de forma local, conservan slot exacto y reinician al cambiar día', () => {
  const choose = vi.fn();
  const { rerender } = render(<AvailabilityPicker {...pickerProps} slots={slots} onSlotSelect={choose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Noche' }));
  const hours = within(screen.getByRole('group', { name: 'Horas disponibles' }));
  expect(hours.getAllByRole('button')).toHaveLength(6);
  fireEvent.click(hours.getByRole('button', { name: '6:00 p. m.' }));
  expect(choose).toHaveBeenCalledWith(slots[10]);
  expect(hours.queryByRole('button', { name: '12:00 p. m.' })).not.toBeInTheDocument();
  rerender(<AvailabilityPicker {...pickerProps} date="2026-10-03" slots={slots} onSlotSelect={choose} />);
  expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
  expect(within(screen.getByRole('group', { name: 'Horas disponibles' })).getAllByRole('button')).toHaveLength(16);
  rerender(<AvailabilityPicker {...pickerProps} slots={slots.slice(0, 3)} onSlotSelect={choose} />);
  expect(screen.queryByRole('group', { name: 'Momento del día' })).not.toBeInTheDocument();
});

it('país/prefijo usa búsqueda accesible, Escape y conserva número al cambiar país', async () => {
  function Field() {
    const [draft, setDraft] = useState<PhoneDraft>(EMPTY_PHONE);
    return <><PhoneField draft={draft} onChange={setDraft} onBlur={vi.fn()} /><output>{phoneValue(draft)}</output></>;
  }
  render(<Field />);
  const flag = screen.getByRole('button', { name: /País y prefijo/ }).querySelector('img');
  expect(flag).not.toBeNull();
  fireEvent.error(flag!);
  expect(screen.getByRole('button', { name: /País y prefijo/ })).toHaveTextContent('do');
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '8095550100' } });
  expect(screen.getByLabelText('Teléfono')).toHaveValue('809-555-0100');
  fireEvent.click(screen.getByRole('button', { name: /País y prefijo/ }));
  fireEvent.change(screen.getByLabelText('Buscar país o prefijo'), { target: { value: 'Canada' } });
  fireEvent.click(screen.getByRole('button', { name: /Canadá/ }));
  expect(screen.getByRole('button', { name: /País y prefijo: Canadá/ })).toHaveFocus();
  expect(screen.getByLabelText('Teléfono')).toHaveValue('809-555-0100');
  fireEvent.click(screen.getByRole('button', { name: /País y prefijo/ }));
  fireEvent.keyDown(screen.getByLabelText('Buscar país o prefijo'), { key: 'Escape' });
  expect(screen.queryByLabelText('Buscar país o prefijo')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '0034 912 345 678' } });
  expect(screen.getByRole('button', { name: /País y prefijo: España/ })).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('+34912345678');
});
