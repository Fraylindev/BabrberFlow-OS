import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BusinessTime } from './BusinessTime';

afterEach(() => vi.useRealTimers());
it('expone el instante íntegro y la fecha completa aunque muestre Hoy', () => {
  render(<BusinessTime value="2026-09-29T02:43:00Z" zone="America/Santo_Domingo" now={new Date('2026-09-28T16:00:00Z')} />);
  const date = screen.getByText('Hoy, 10:43 p. m.');
  expect(date.tagName).toBe('TIME');
  expect(date).toHaveAttribute('datetime', '2026-09-29T02:43:00.000Z');
  expect(date).toHaveAttribute('title', '28 de septiembre de 2026, 10:43 p. m.');
});
it('cambia Hoy a Ayer en medianoche y se actualiza al regresar tras suspensión', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-28T03:59:59Z'));
  const { unmount } = render(<BusinessTime value="2026-09-28T03:59:00Z" zone="America/Santo_Domingo" />);
  expect(screen.getByText('Hoy, 11:59 p. m.')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText('Ayer, 11:59 p. m.')).toBeInTheDocument();
  act(() => {
    vi.setSystemTime(new Date('2026-09-30T05:00:00Z'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(screen.getByText('27 sept, 11:59 p. m.')).toBeInTheDocument();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it('no inventa la zona si no está disponible ni convierte una fecha civil', () => {
  const { rerender } = render(<BusinessTime value="2026-09-28T04:00:00Z" />);
  expect(screen.getByText('Fecha no disponible')).toBeInTheDocument();
  expect(document.querySelector('time')).toBeNull();
  rerender(<BusinessTime value="2026-09-26" kind="date" zone="America/Santo_Domingo" now={new Date('2026-09-28T16:00:00Z')} />);
  expect(screen.getByText('26 sept')).toHaveAttribute('datetime', '2026-09-26');
});
