import { ApiError } from './api.ts';

export function isTransientQueryError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status >= 500 || error.status === 408 || error.status === 429;
  return error instanceof Error && error.name !== 'AbortError';
}

export function retryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < 2 && isTransientQueryError(error);
}

export function hasDefinitiveAccessError(error: unknown): boolean {
  return error instanceof ApiError && [401, 403].includes(error.status);
}
