import { ServiceUnavailableException } from '@nestjs/common';

export const CLERK_VERIFICATION_TIMEOUT_MS = 8_000;

/** SDK calls are not abortable; discard late results and stop subsequent work. */
export async function withClerkDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs = CLERK_VERIFICATION_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const reason = new ServiceUnavailableException(
        'Servicio de autenticación no disponible temporalmente',
      );
      controller.abort(reason);
      reject(reason);
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      expired,
      Promise.resolve().then(() => operation(controller.signal)),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
