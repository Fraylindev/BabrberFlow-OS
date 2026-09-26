import assert from 'node:assert/strict';
import test from 'node:test';
import { runAuthOperation } from './auth-operation.ts';

test('an unavailable identity dependency reaches a terminal error and aborts its request', async () => {
  let signal: AbortSignal | undefined;
  await assert.rejects(runAuthOperation((current) => {
    signal = current;
    return new Promise(() => undefined);
  }, undefined, 10), /tardó demasiado/);
  assert.equal(signal?.aborted, true);
});

test('changing identity aborts the previous request; a late response cannot replace the result', async () => {
  const controller = new AbortController();
  let finish!: (value: string) => void;
  const pending = runAuthOperation(() => new Promise<string>((resolve) => { finish = resolve; }), controller.signal);
  await Promise.resolve();
  controller.abort(new Error('identity changed'));
  await assert.rejects(pending, /identity changed/);
  finish('old identity');
  assert.equal(await runAuthOperation(async () => 'current identity'), 'current identity');
});
