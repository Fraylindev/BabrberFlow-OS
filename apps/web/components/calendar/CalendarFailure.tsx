'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { calendarError } from '@/lib/calendar';
import { Button } from '@/components/ui/Button';
export function CalendarFailure({
  error,
  onRetry,
  label = 'Volver a cargar',
}: {
  error: unknown;
  onRetry: () => void;
  label?: string;
}) {
  const [remaining, setRemaining] = useState(() =>
    error instanceof ApiError && error.status === 429 ? (error.retryAfterSeconds ?? 60) : 0,
  );
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  return (
    <div className="space-y-3">
      <p role="alert">{calendarError(error)}</p>
      {remaining > 0 && <p role="status">Podrás continuar en {remaining} segundos.</p>}
      {error instanceof ApiError && error.status === 401 ? (
        <Link className="underline" href="/login">
          Volver a iniciar sesión
        </Link>
      ) : (
        <Button tone="light" disabled={remaining > 0} onClick={onRetry}>
          {label}
        </Button>
      )}
    </div>
  );
}
