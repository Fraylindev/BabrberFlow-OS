import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, configureApiAuth } from '@/lib/api';
import { CalendarFailure } from './CalendarFailure';

let dispose: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
  dispose = configureApiAuth(async () => ({ token: null, organizationId: null }));
});
afterEach(() => {
  cleanup();
  dispose();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe('M3 retry countdown through the real HTTP client', () => {
  it.each([
    ['17', 17], ['900', 300], ['Wed, 14 Oct 2026 12:00:17 GMT', 17],
    [null, 60], ['invalid', 60], ['1.5', 60],
  ])('uses header %s for the retry action', async (header, seconds) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ message: 'Demasiados intentos.' }, {
        status: 429, headers: header === null ? {} : { 'Retry-After': String(header) },
      }),
    );
    let error: unknown;
    try { await api.patch('/bookings/synthetic/reschedule', {}); } catch (cause) { error = cause; }
    expect(error).toBeInstanceOf(ApiError);
    render(<CalendarFailure error={error} onRetry={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(`Podrás continuar en ${seconds} segundos.`);
    expect(screen.getByRole('button', { name: 'Volver a cargar' })).toBeDisabled();
    for (let i = 0; i < Number(seconds); i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    }
    expect(screen.getByRole('button', { name: 'Volver a cargar' })).toBeEnabled();
    expect(screen.queryByRole('status')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
