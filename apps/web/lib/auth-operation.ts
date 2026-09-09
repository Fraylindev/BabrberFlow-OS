/** Bounds identity/bootstrap requests so an unavailable dependency cannot spin forever. */
export async function runAuthOperation<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  parentSignal?: AbortSignal,
  timeoutMs = 15_000,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: () => void = () => undefined;
  const cancelled = new Promise<never>((_, reject) => {
    onAbort = () => {
      const reason = parentSignal?.reason ?? new Error('Acceso cancelado');
      controller.abort(reason);
      reject(reason);
    };
    parentSignal?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => {
      const reason = new Error('La consulta de acceso tardó demasiado. Vuelve a intentarlo.');
      controller.abort(reason);
      reject(reason);
    }, timeoutMs);
  });
  try {
    if (parentSignal?.aborted) onAbort();
    return await Promise.race([
      cancelled,
      Promise.resolve().then(() => {
        controller.signal.throwIfAborted();
        return operation(controller.signal);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onAbort);
  }
}
