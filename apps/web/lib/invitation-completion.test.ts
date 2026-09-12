import assert from 'node:assert/strict';
import test from 'node:test';
import { completeInvitationAccess } from './invitation-completion.ts';

test('refreshes access only after acceptance and returns READY', async () => {
  const calls: string[] = [];
  const ready = await completeInvitationAccess(
    async () => {
      calls.push('accept');
    },
    async () => {
      calls.push('refresh');
      return { state: 'READY' };
    },
    new AbortController().signal,
  );
  assert.equal(ready, true);
  assert.deepEqual(calls, ['accept', 'refresh']);
});

test('a late acceptance after leaving or changing identity cannot refresh current access', async () => {
  const controller = new AbortController();
  let release!: () => void;
  let refreshed = false;
  const pending = completeInvitationAccess(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    async () => {
      refreshed = true;
      return { state: 'READY' };
    },
    controller.signal,
  );
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  await Promise.resolve();
  controller.abort();
  await rejected;
  release();
  await Promise.resolve();
  assert.equal(refreshed, false);
});

test('a late bootstrap cannot navigate a discarded visit; a fresh retry can succeed', async () => {
  const controller = new AbortController();
  let release!: (value: { state: string }) => void;
  let started!: () => void;
  const refreshStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  const pending = completeInvitationAccess(
    async () => undefined,
    () => {
      started();
      return new Promise((resolve) => {
        release = resolve;
      });
    },
    controller.signal,
  );
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  await refreshStarted;
  controller.abort();
  await rejected;
  release({ state: 'READY' });
  assert.equal(
    await completeInvitationAccess(
      async () => undefined,
      async () => ({ state: 'READY' }),
      new AbortController().signal,
    ),
    true,
  );
});

test('does not navigate if acceptance succeeded but membership bootstrap is unavailable', async () => {
  assert.equal(
    await completeInvitationAccess(
      async () => undefined,
      async () => null,
      new AbortController().signal,
    ),
    false,
  );
});
