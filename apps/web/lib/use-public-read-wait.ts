'use client';

import { useEffect, useState } from 'react';
import { ApiError } from './api';

export function usePublicReadWait(error: unknown, updatedAt: number) {
  const [now, setNow] = useState(() => Date.now());
  const limited = error instanceof ApiError && error.status === 429;
  useEffect(() => {
    if (!limited) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [limited, updatedAt]);
  return limited ? Math.max(0, Math.ceil((updatedAt + Math.max(1, error.retryAfterSeconds ?? 60) * 1000 - Math.max(now, updatedAt)) / 1000)) : 0;
}
