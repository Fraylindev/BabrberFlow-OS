import { test as base, expect } from '@playwright/test';

// Doble anónimo del SDK: no autentica, no emite tokens ni llama a Clerk.
// El layout raíz conserva su ClerkProvider real para todas las rutas.
const anonymousClerkScript = `
(() => {
  const snapshot = { client: null, session: null, user: null, organization: null };
  window.Clerk = {
    loaded: false, status: 'loading', ...snapshot,
    load: async function () { this.loaded = true; this.status = 'ready'; },
    addListener: (listener) => { queueMicrotask(() => listener(snapshot)); return () => {}; },
    on: (event, listener, options) => { if (event === 'status' && options?.notify) listener('ready'); return () => {}; },
    __internal_updateProps: async () => {},
    signOut: async () => {},
    getToken: async () => null,
    isStandardBrowser: true,
    instanceType: 'development',
  };
})();`;

export const test = base.extend({
  context: async ({ context }, runContext) => {
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        await route.fallback();
        return;
      }
      const syntheticClerkHost = [
        'synthetic.clerk.accounts.dev',
        'example.clerk.accounts.dev',
      ].includes(url.hostname);
      if (syntheticClerkHost && /\/clerk\.browser\.js$/.test(url.pathname)) {
        await route.fulfill({
          contentType: 'application/javascript',
          headers: { 'access-control-allow-origin': '*', 'cache-control': 'no-store' },
          body: anonymousClerkScript,
        });
        return;
      }
      if (syntheticClerkHost && /\/ui\.browser\.js$/.test(url.pathname)) {
        // Next precarga también la UI de Clerk; el flujo anónimo no monta sus controles.
        await route.fulfill({
          contentType: 'application/javascript',
          headers: { 'access-control-allow-origin': '*', 'cache-control': 'no-store' },
          body: 'window.__internal_ClerkUICtor = class { constructor() { throw new Error("Este fixture solo admite rutas públicas anónimas"); } };',
        });
        return;
      }
      if (url.hostname === 'flagcdn.com' && /^\/w40\/[a-z]{2}\.png$/.test(url.pathname)) {
        // Imagen neutra del fixture; no acredita el arte de las banderas externas.
        await route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="24"><title>Fixture local de país</title><rect width="40" height="24" fill="#ddd"/></svg>',
        });
        return;
      }
      // Las rutas HTTP de cada spec tienen prioridad. Ningún externo desconocido se silencia.
      await route.abort('blockedbyclient');
      throw new Error(`Recurso externo sin fixture local: ${url.origin}${url.pathname}`);
    });
    await runContext(context);
  },
});

export { expect };
