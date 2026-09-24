import assert from 'node:assert/strict';
import test from 'node:test';
import { api, ApiError, API_REQUEST_TIMEOUT_MS, configureApiAuth, publicMediaUrl } from './api.ts';

test('serves only signed media locators through the same-origin image path', () => {
  assert.equal(publicMediaUrl('/public/qa-test/media/payload.signature'), '/media-proxy/qa-test/payload.signature');
  assert.equal(publicMediaUrl('https://cloudinary.example/private-image'), '');
  assert.equal(publicMediaUrl('/public/qa-test/media/../other'), '');
});

test('preserves non-JSON HTTP errors and real Retry-After without exposing the body', async (t) => {
  const cleanup = configureApiAuth(async () => ({ token: null, organizationId: null }));
  t.after(cleanup);
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response('<html>private gateway detail</html>', {
        status: 503,
        headers: { 'Retry-After': '7' },
      }),
  );
  await assert.rejects(api.get('/auth/clerk/bootstrap'), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 503);
    assert.equal(error.retryAfterSeconds, 7);
    assert.doesNotMatch(error.message, /html|private gateway/);
    return true;
  });
});

test('does not misrepresent a malformed successful response as empty data', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('not JSON', { status: 200 }));
  await assert.rejects(
    api.get('/public/test'),
    (error: unknown) => error instanceof ApiError && error.status === 502,
  );
});

test('keeps JSON validation, body retry delay and pagination headers', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ message: ['Revisa el campo'], retryAfterSeconds: 3 }, { status: 429 }),
  );
  await assert.rejects(api.get('/public/test'), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.message, 'Revisa el campo');
    assert.equal(error.retryAfterSeconds, 3);
    return true;
  });
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json([{ name: 'Synthetic' }], { headers: { 'x-total-count': '21' } }),
  );
  const result = await api.getWithHeaders('/public/test');
  assert.equal(result.headers.get('x-total-count'), '21');
  assert.deepEqual(result.data, [{ name: 'Synthetic' }]);
});

test('cancels before sending a mutation when identity or tenant changes during token resolution', async (t) => {
  let release!: (value: { token: string; organizationId: string }) => void;
  const cleanupOld = configureApiAuth(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({ ok: true }));
  const pending = api.post('/auth/clerk/invitations', {});
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  await Promise.resolve();
  const cleanupCurrent = configureApiAuth(async () => ({ token: null, organizationId: null }));
  t.after(cleanupCurrent);
  await rejected;
  cleanupOld(); // A late provider cleanup must not erase the current resolver.
  release({ token: 'synthetic-not-secret', organizationId: 'previous' });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(fetchMock.mock.callCount(), 0);
  await api.post('/auth/clerk/invitations', {});
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('aborts a request and ignores late content after an explicit caller cancellation', async (t) => {
  const controller = new AbortController();
  let release!: (value: Response) => void;
  let requestSignal: AbortSignal | null | undefined;
  t.mock.method(globalThis, 'fetch', (_url: unknown, options?: RequestInit) => {
    requestSignal = options?.signal;
    return new Promise<Response>((resolve) => {
      release = resolve;
    });
  });
  const pending = api.post('/public/test', {}, { signal: controller.signal });
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  await Promise.resolve();
  controller.abort();
  await rejected;
  assert.equal(requestSignal?.aborted, true);
  release(Response.json({ previousContext: true }));
});

test('bounds token lookup and never sends a late mutation after the deadline', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const cleanup = configureApiAuth(() => new Promise(() => undefined));
  t.after(cleanup);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({ ok: true }));
  const pending = api.post('/auth/clerk/invitations', {});
  const rejected = assert.rejects(
    pending,
    (error: unknown) => error instanceof ApiError && error.status === 503,
  );
  await Promise.resolve();
  t.mock.timers.tick(API_REQUEST_TIMEOUT_MS);
  await rejected;
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('bounds a fetch that does not settle and aborts its signal', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal: AbortSignal | null | undefined;
  t.mock.method(globalThis, 'fetch', (_url: unknown, options?: RequestInit) => {
    signal = options?.signal;
    return new Promise(() => undefined);
  });
  const pending = api.get('/public/test');
  const rejected = assert.rejects(
    pending,
    (error: unknown) => error instanceof ApiError && error.status === 503,
  );
  await Promise.resolve();
  t.mock.timers.tick(API_REQUEST_TIMEOUT_MS);
  await rejected;
  assert.equal(signal?.aborted, true);
});
