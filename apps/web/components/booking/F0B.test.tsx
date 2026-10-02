import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { Booking, Invoice } from '@/lib/api';
import { BookingActions } from './BookingActions';
import { synchronizeInvoiceQueries } from '@/lib/queries/invoice-cache';
import { queryKeys } from '@/lib/queries/keys';

const booking: Booking = { id: 'booking', startTime: '2026-09-30T10:00:00Z', endTime: '2026-09-30T11:00:00Z', status: 'PENDING', clientId: 'client', professionalId: 'professional', serviceId: 'service', invoice: null };
const invoice: Invoice = { id: 'invoice', state: 'PAID', amount: '50.00', currency: 'DOP', issuedAt: '2026-09-30T12:00:00Z', booking: { id: booking.id, startTime: booking.startTime, clientName: 'QA', serviceName: 'QA', professionalName: 'QA' }, payment: { method: 'CASH', paidAt: '2026-09-30T12:00:00Z' } };

function actions(overrides: Partial<Parameters<typeof BookingActions>[0]> = {}) {
  const props = { booking, isBarber: false, isUpdating: false, isIssuing: false, layout: 'mobile' as const, onStatusChange: vi.fn(), onReschedule: vi.fn(), onIssueInvoice: vi.fn(), onViewInvoices: vi.fn(), ...overrides };
  render(<BookingActions {...props} />);
  return props;
}

describe('F0-B: acciones móviles y factura autoritativa', () => {
  it.each(['ISSUED', 'PAID'] as const)('en escritorio la factura %s se consulta desde el menú sin repetir emisión', async state => {
    const props = actions({ layout: 'table', booking: { ...booking, status: 'COMPLETED', invoice: { id: invoice.id, state } }, onNotifications: vi.fn() });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByText(/Factura pagada|Pendiente de cobro/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de la reserva' }));
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Ver facturación' })).toHaveFocus());
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'End' });
    expect(screen.getByRole('menuitem', { name: 'Avisos por correo' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Home' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ver facturación' }));
    expect(props.onViewInvoices).toHaveBeenCalledOnce();
    expect(props.onIssueInvoice).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Más acciones de la reserva' })).toHaveFocus());
  });
  it('deja solo Confirmar y Más acciones; reprogramación y cancelación permanecen accesibles', async () => {
    const props = actions();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(props.onStatusChange).toHaveBeenCalledWith('CONFIRMED');
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de la reserva' }));
    expect(screen.getByRole('menuitem', { name: 'Reprogramar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cancelar' }));
    expect(props.onStatusChange).toHaveBeenCalledWith('CANCELLED');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Más acciones de la reserva' })).toHaveFocus());
  });
  it('ofrece Completar como principal y permite cerrar el menú con Escape', async () => {
    actions({ booking: { ...booking, status: 'CONFIRMED' } });
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Completar' })).toBeInTheDocument();
    const more = screen.getByRole('button', { name: 'Más acciones de la reserva' });
    fireEvent.click(more);
    expect(screen.getByRole('menuitem', { name: 'No asistió' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(more).toHaveFocus());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
  it('conserva los permisos propios del Profesional sin introducir acciones prohibidas', () => {
    actions({ isBarber: true, booking: { ...booking, status: 'CONFIRMED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de la reserva' }));
    expect(screen.getByRole('menuitem', { name: 'No asistió' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Cancelar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Reprogramar' })).not.toBeInTheDocument();
  });
  it('no cierra el menú por su propio scroll ni por un scroll anterior sin movimiento del ancla', () => {
    actions();
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de la reserva' }));
    fireEvent.scroll(screen.getByRole('menu'));
    fireEvent.scroll(window);
    expect(screen.getByRole('menuitem', { name: 'Reprogramar' })).toBeInTheDocument();
  });
  it.each(['ISSUED', 'PAID'] as const)('una factura %s nunca vuelve a ofrecer emisión', (state) => {
    const props = actions({ booking: { ...booking, status: 'COMPLETED', invoice: { id: invoice.id, state } } });
    expect(screen.queryByRole('button', { name: 'Emitir factura' })).not.toBeInTheDocument();
    expect(screen.getByText(state === 'PAID' ? 'Factura pagada' : 'Pendiente de cobro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver facturación' }));
    expect(props.onViewInvoices).toHaveBeenCalledOnce();
  });
  it('emite solo si el servidor confirmó ausencia de factura, y no deduce ausencia de un campo omitido', () => {
    const view = render(<BookingActions booking={{ ...booking, status: 'COMPLETED' }} isBarber={false} isUpdating={false} isIssuing={false} layout="mobile" onStatusChange={vi.fn()} onReschedule={vi.fn()} onIssueInvoice={vi.fn()} onViewInvoices={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Emitir factura' })).toBeInTheDocument();
    view.unmount();
    actions({ booking: { ...booking, status: 'COMPLETED', invoice: undefined } });
    expect(screen.queryByRole('button', { name: 'Emitir factura' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver facturación' })).toBeInTheDocument();
  });
  it('sincroniza pago y emisión solo en la caché del usuario/negocio/rol de la operación', async () => {
    const client = new QueryClient();
    const keyA = [...queryKeys.bookings.scope('A'), 'visit-A', {}];
    const keyB = [...queryKeys.bookings.scope('B'), 'visit-B', {}];
    client.setQueryData(keyA, [booking]);
    client.setQueryData(keyB, [booking]);
    const issued = { ...invoice, state: 'ISSUED' as const, payment: null };
    const invoicesKey = queryKeys.invoices.list('A', { page: 1, limit: 20 });
    client.setQueryData(invoicesKey, { items: [issued], pagination: {} });
    await synchronizeInvoiceQueries(client, issued, 'A');
    expect(client.getQueryData<Booking[]>(keyA)?.[0].invoice?.state).toBe('ISSUED');
    await synchronizeInvoiceQueries(client, invoice, 'A');
    expect(client.getQueryData<Booking[]>(keyA)?.[0].invoice?.state).toBe('PAID');
    expect(client.getQueryData<Booking[]>(keyB)?.[0].invoice).toBeNull();
    expect(client.getQueryData<{ items: Invoice[] }>(invoicesKey)?.items[0].state).toBe('PAID');
    client.clear();
  });
});
