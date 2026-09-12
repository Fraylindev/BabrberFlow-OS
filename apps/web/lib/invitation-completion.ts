import { runAuthOperation } from './auth-operation.ts';

/** No navigation or bootstrap refresh may follow a discarded acceptance. */
export async function completeInvitationAccess(
  accept: (signal: AbortSignal) => Promise<unknown>,
  refresh: () => Promise<{ state: string } | null>,
  parentSignal: AbortSignal,
): Promise<boolean> {
  return runAuthOperation(
    async (signal) => {
      await accept(signal);
      signal.throwIfAborted();
      const result = await refresh();
      signal.throwIfAborted();
      return result?.state === 'READY';
    },
    parentSignal,
    30_000,
  );
}
