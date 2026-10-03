import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DateTimeStep } from '@/app/[slug]/_components/DateTimeStep';
import { ContactStep } from '@/app/[slug]/_components/ContactStep';
import { ConfirmStep } from '@/app/[slug]/_components/ConfirmStep';
import { BookingPhoto, bookingPhotoFallback } from './BookingPhoto';
import { WeekCarousel } from '@/components/booking/WeekCarousel';
import { api, type PublicAvailabilitySlot } from '@/lib/api';

it('precarga la siguiente semana y conserva día/slot al navegar con flechas y volver', async () => {
  const get = vi.spyOn(api, 'get').mockImplementation(async path => {
    const search = new URL(`http://test${path}`).searchParams;
    return path.includes('availability-days')
      ? { from: search.get('from'), to: search.get('to'), serviceId: 'cut', availableDates: [search.get('from')] }
      : { slots: [{ time: '10:00', startTime: '2026-10-01T14:00:00Z', professionalId: 'alex' }] };
  });
  function Flow() {
    const [date, setDate] = useState('');
    const [slot, setSlot] = useState<PublicAvailabilitySlot | null>(null);
    return <DateTimeStep slug="north" visit="isolated" serviceId="cut" professionalId="alex" minimumBookingDate="2026-10-01" date={date}
      selectedStartTime={slot?.startTime} onDateChange={value => { setDate(value); setSlot(null); }} onSlotSelect={setSlot} onClearSlot={() => setSlot(null)} onBack={vi.fn()} onNext={vi.fn()} />;
  }
  render(<QueryClientProvider client={new QueryClient()}><Flow /></QueryClientProvider>);
  await waitFor(() => expect(get.mock.calls.some(([path]) => path.includes('from=2026-10-08') && path.includes('to=2026-10-14'))).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: '1 de octubre de 2026' }));
  fireEvent.click(await screen.findByRole('button', { name: '10:00 a. m.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Siete días siguientes' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '8 de octubre de 2026' })).toBeEnabled());
  expect(screen.getByRole('button', { name: '10:00 a. m.' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Continuar con tus datos' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Siete días anteriores' }));
  await waitFor(() => expect(screen.getByRole('button', { name: '1 de octubre de 2026' })).toHaveAttribute('aria-pressed', 'true'));
  expect(screen.getByRole('button', { name: 'Siete días anteriores' })).toBeDisabled();
});

it('el carrusel cambia una semana al ajustar y suprime clics accidentales tras scroll', async () => {
  const change = vi.fn(), select = vi.fn();
  const { container } = render(<WeekCarousel weekStart="2026-10-01" next={<span>Siguiente</span>} disabled={false} onChange={change}><button onClick={select}>Día</button></WeekCarousel>);
  const rail = container.querySelector('.week-carousel')!;
  Object.defineProperty(rail, 'clientWidth', { value: 300 });
  rail.scrollLeft = 300;
  fireEvent.scroll(rail);
  fireEvent.click(screen.getByRole('button', { name: 'Día' }));
  expect(select).not.toHaveBeenCalled();
  await waitFor(() => expect(change).toHaveBeenCalledExactlyOnceWith(1));
});

it('el límite final solo presenta regreso y no consulta un extremo no representable', async () => {
  const get = vi.spyOn(api, 'get').mockResolvedValue({ availableDates: [] });
  render(<QueryClientProvider client={new QueryClient()}><DateTimeStep slug="limit" serviceId="cut" professionalId="alex" minimumBookingDate="9999-12-24" date="" onDateChange={vi.fn()} onSlotSelect={vi.fn()} onBack={vi.fn()} onNext={vi.fn()} /></QueryClientProvider>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Siete días siguientes' })).toBeDisabled());
  expect(get.mock.calls.every(([path]) => !path.includes('10000'))).toBe(true);
});

it('el fallback tras imagen rota mantiene iniciales estables del nombre', () => {
  const image = { id: 'photo', url: '/public/north/media/photo', decorative: false, altText: 'Foto sintética', caption: null };
  const { container, rerender } = render(<BookingPhoto name="Alex Norte" kind="professional" image={image} />);
  fireEvent.error(container.querySelector('img')!);
  expect(container).toHaveTextContent('AN');
  expect(container.querySelector('img')).toBeNull();
  const color = container.querySelector('span')!.style.backgroundColor;
  rerender(<BookingPhoto name="Alex Norte" kind="professional" />);
  expect(container.querySelector('span')!.style.backgroundColor).toBe(color);
  expect(bookingPhotoFallback(' Alex   Norte ')).toEqual(bookingPhotoFallback('Alex Norte'));
});

it('intención de cuenta Clerk conserva opción visible sin pedir contraseña', () => {
  function Contact() {
    const [wanted, setWanted] = useState(false);
    return <ContactStep clientName="QA" clientPhone="+18095550100" clientEmail="qa@example.test" emailOptedIn={false} createAccount={wanted}
      onAccountChange={setWanted} onNameChange={vi.fn()} onPhoneChange={vi.fn()} onEmailChange={vi.fn()} onEmailOptInChange={vi.fn()} onBack={vi.fn()} onNext={vi.fn()} />;
  }
  render(<Contact />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Crear cuenta para reservar más rápido' }));
  expect(screen.getByRole('checkbox', { name: 'Crear cuenta para reservar más rápido' })).toBeChecked();
  expect(screen.queryByLabelText('Crea una contraseña')).not.toBeInTheDocument();
  expect(screen.getByText('Crearás tu cuenta después de registrar la reserva.')).toBeVisible();
});

it('revisión usa duración legible, moneda, teléfono y Editar contextual sin etiqueta de catálogo', () => {
  const edit = vi.fn();
  render(<ConfirmStep serviceName="Servicio QA" professionalName="Alex QA" startTime="2026-10-03T14:00:00Z" timeZone="America/Santo_Domingo" duration={90} price="500"
    clientName="QA" clientPhone="+18097297589" clientEmail="qa@example.test" submitting={false} submitError={null} onBack={vi.fn()} onConfirm={vi.fn()} onEdit={edit} />);
  expect(screen.getByText(/1 h 30 min · RD\$/)).toBeVisible();
  expect(screen.getByText('+1 809-729-7589')).toBeVisible();
  expect(screen.queryByText(/catálogo/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Editar datos' }));
  expect(edit).toHaveBeenCalledWith('contact');
});
