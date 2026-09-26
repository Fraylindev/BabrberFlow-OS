import { expect, test, type BrowserContext, type FrameLocator, type Page } from '@playwright/test';

const message = 'Hola. Acabo de registrar una reserva en su página y quisiera consultar con ustedes.';
const explanation = 'Abrirás WhatsApp. Revisa y envía el mensaje allí; abrirlo no confirma tu reserva.';
const linkName = 'Abrir WhatsApp (se abre en una pestaña nueva)';
const result = {
  booking: {
    id: 'booking-qa', serviceId: 'service-qa', professionalId: 'professional-qa',
    startTime: '2099-01-05T14:00:00.000Z', endTime: '2099-01-05T14:30:00.000Z', status: 'PENDING',
  },
  accountCreated: false, accountCreationError: null,
};

// Controlled HTTP boundary; all rendering, events and navigation use real Next/Chrome.
// External destination is intercepted so QA never contacts a WhatsApp number.
async function fixture(context: BrowserContext) {
  const state = {
    phone: '+18095551234' as string | null,
    postStatus: 201, catalogStatus: 200, posts: 0, reads: 0,
    postDelay: 0, catalogGate: null as Promise<void> | null, destinations: [] as string[],
    writes: [] as unknown[],
  };
  await context.route('https://wa.me/**', async (route) => {
    state.destinations.push(route.request().url());
    await route.fulfill({ contentType: 'text/html', body: '<h1>Destino externo interceptado por QA</h1>' });
  });
  await context.route('**/public/qa-whatsapp-*/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const headers = { 'access-control-allow-origin': '*', 'cache-control': 'no-store' };
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { ...headers,
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
      } });
      return;
    }
    if (url.pathname.endsWith('/booking-data')) {
      state.reads++;
      if (state.catalogGate) await state.catalogGate;
      const slug = url.pathname.split('/')[2];
      await route.fulfill({ status: state.catalogStatus, headers, json: state.catalogStatus === 200 ? {
        minimumBookingDate: '2026-09-14',
        organization: {
          name: slug.endsWith('-b') ? 'Estudio QA Sur' : 'Estudio QA Norte', slug,
          phone: slug.endsWith('-b') ? '+34912345678' : state.phone,
          description: 'Negocio controlado para QA de WhatsApp.', address: null, googleMapsUrl: null,
        },
        whatsappBaseUrl: 'https://untrusted.invalid/',
        services: [{ id: 'service-qa', name: 'Corte QA', description: null, duration: 30, price: '500.00' }],
        professionals: [{ id: 'professional-qa', name: 'Alex QA', bio: null, avatar: null }],
      } : { message: 'Información no disponible.' } });
    } else if (url.pathname.endsWith('/media')) {
      await route.fulfill({ headers, json: {
        hero: null, gallery: [], services: [], professionals: [], promotions: [],
      } });
    } else if (url.pathname.endsWith('/availability')) {
      await route.fulfill({ headers, json: { date: '2099-01-05', serviceId: 'service-qa',
        slots: [{ time: '10:00', professionalId: 'professional-qa', startTime: result.booking.startTime }],
      } });
    } else if (url.pathname.endsWith('/bookings')) {
      state.posts++;
      state.writes.push(req.postDataJSON());
      if (state.postDelay) await new Promise((resolve) => setTimeout(resolve, state.postDelay));
      await route.fulfill({ status: state.postStatus, headers, json: state.postStatus === 201 ? result : {
        message: state.postStatus === 409 ? 'El horario ya no está disponible. Elige otro horario.' : 'Información no disponible.',
      } });
    } else {
      await route.abort();
    }
  });
  return state;
}

async function toConfirm(root: Page | FrameLocator) {
  await root.getByRole('button', { name: 'Reservar cita', exact: true }).click();
  await root.getByRole('button', { name: /Corte QA/ }).click();
  await root.getByRole('button', { name: 'Continuar', exact: true }).click();
  await root.getByRole('button', { name: /Alex QA/ }).click();
  await root.getByRole('button', { name: 'Continuar', exact: true }).click();
  await root.getByLabel('Fecha', { exact: true }).fill('2099-01-05');
  await root.getByRole('button', { name: '10:00', exact: true }).click();
  await root.getByRole('button', { name: 'Continuar', exact: true }).click();
  await root.getByLabel('Nombre completo').fill('Visitante QA');
  await root.getByLabel('Teléfono', { exact: true }).fill('8095554321');
  await root.getByLabel('Correo (opcional)').fill('visitante@example.test');
  await root.getByRole('button', { name: 'Continuar', exact: true }).click();
  await root.getByRole('button', { name: 'Continuar', exact: true }).click();
}

async function success(root: Page | FrameLocator) {
  await root.getByRole('button', { name: 'Confirmar reserva', exact: true }).click();
  await expect(root.getByRole('status')).toHaveText('Tu reserva quedó registrada');
}

test('C2 full flow: loading/pending, no automatic popup, native accessible link, keyboard and repeated click', async ({ page, context }, info) => {
  test.setTimeout(60_000);
  const state = await fixture(context);
  let releaseCatalog!: () => void;
  state.catalogGate = new Promise((resolve) => { releaseCatalog = resolve; });
  state.postDelay = 500;
  const errors: string[] = [];
  const consoleIssues: string[] = [];
  await info.attach('environment.json', { body: JSON.stringify({ browser: context.browser()?.version(), viewport: page.viewportSize(), role: 'anonymous', api: 'controlled C1 HTTP responses', externalNavigation: 'intercepted' }), contentType: 'application/json' });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (entry) => {
    if (['warning', 'error'].includes(entry.type())) consoleIssues.push(entry.text());
  });
  await page.goto('/qa-whatsapp-a', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Cargando página del negocio…')).toBeAttached();
  await expect(page.getByRole('link', { name: linkName })).toHaveCount(0);
  releaseCatalog();
  await toConfirm(page);
  await page.getByRole('button', { name: 'Confirmar reserva', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirmando…' })).toBeDisabled();
  await expect(page.getByRole('link', { name: linkName })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Tu reserva quedó registrada');
  expect(context.pages()).toHaveLength(1);
  expect(state.destinations).toHaveLength(0);
  const link = page.getByRole('link', { name: linkName });
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAccessibleDescription(explanation);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(await link.evaluate((el) => !!el.querySelector('a, button, input, [role="button"]') ||
    !!el.parentElement?.closest('a, button, [role="button"]'))).toBe(false);
  await page.getByRole('heading', { name: 'Reserva tu cita en Estudio QA Norte' }).focus();
  await page.keyboard.press('Tab');
  await expect(link).toBeFocused();
  expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('success-focus.png'), fullPage: true });
  for (const activation of ['keyboard', 'pointer']) {
    const popupEvent = context.waitForEvent('page');
    if (activation === 'keyboard') await page.keyboard.press('Enter');
    else await link.click();
    const popup = await popupEvent;
    await popup.waitForLoadState();
    expect(context.pages()).toHaveLength(2);
    expect(await popup.evaluate(() => window.opener)).toBeNull();
    expect(new URL(popup.url()).origin).toBe('https://wa.me');
    expect(new URL(popup.url()).pathname).toBe('/18095551234');
    expect([...new URL(popup.url()).searchParams]).toEqual([['text', message]]);
    await popup.close();
  }
  expect(state.destinations).toHaveLength(2);
  expect(state.posts).toBe(1);
  expect(state.writes).toEqual([{
    serviceId: 'service-qa', professionalId: 'professional-qa', startTime: result.booking.startTime,
    clientName: 'Visitante QA', clientPhone: '8095554321', clientEmail: 'visitante@example.test', createAccount: false,
  }]);
  expect(result.booking.status).toBe('PENDING');
  expect(errors).toEqual([]);
  await info.attach('console.json', { body: JSON.stringify(consoleIssues, null, 2), contentType: 'application/json' });
  expect(consoleIssues.filter((entry) => !entry.startsWith('Clerk:'))).toEqual([]);
});

for (const phone of [null, '8095551234', '+18095551234\n']) {
  test(`C2 ineligible published phone ${JSON.stringify(phone)} preserves success`, async ({ page, context }) => {
    const state = await fixture(context);
    state.phone = phone;
    await page.goto('/qa-whatsapp-a');
    await toConfirm(page);
    await success(page);
    await expect(page.getByRole('link', { name: linkName })).toHaveCount(0);
    await expect(page.getByText(explanation)).toHaveCount(0);
    expect(state.posts).toBe(1);
    expect(context.pages()).toHaveLength(1);
  });
}

test('C2 booking conflict then explicit recovery; retired catalog removes success/contact', async ({ page, context }) => {
  const state = await fixture(context);
  state.postStatus = 409;
  await page.goto('/qa-whatsapp-a');
  await toConfirm(page);
  await page.getByRole('button', { name: 'Confirmar reserva', exact: true }).click();
  await expect(page.getByText('El horario ya no está disponible. Elige otro horario.')).toBeVisible();
  await expect(page.getByRole('link', { name: linkName })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
  state.postStatus = 201;
  await success(page);
  expect(state.posts).toBe(2);
  state.catalogStatus = 404;
  // Signal the return-to-visible event in Chrome. Automation keeps pages visible,
  // so this exercises the real listener/HTTP/render path, not an OS tab switch.
  const readsBefore = state.reads;
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(() => state.reads).toBeGreaterThan(readsBefore);
  await expect(page.getByRole('heading', { name: 'Esta página no está disponible' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('link', { name: linkName })).toHaveCount(0);
  await expect(page.getByText('Estudio QA Norte', { exact: true })).toHaveCount(0);
  expect(state.posts).toBe(2);
  expect(context.pages()).toHaveLength(1);
});

test('C2 two slugs A → B → A use only their published recipient', async ({ page, context }) => {
  const state = await fixture(context);
  for (const [slug, digits] of [['a', '18095551234'], ['b', '34912345678'], ['a', '18095551234']]) {
    await page.goto(`/qa-whatsapp-${slug}`);
    await expect(page.getByRole('link', { name: linkName })).toHaveCount(0);
    await toConfirm(page);
    await success(page);
    await expect(page.getByRole('link', { name: linkName })).toHaveAttribute('href', `https://wa.me/${digits}?text=${encodeURIComponent(message)}`);
  }
  expect(state.posts).toBe(3);
  expect(state.destinations).toHaveLength(0);
});

test('C2 catalog error recovers explicitly; POST 404 never shows success or WhatsApp', async ({ page, context }) => {
  const state = await fixture(context);
  state.catalogStatus = 503;
  await page.goto('/qa-whatsapp-a');
  await expect(page.getByRole('heading', { name: 'No pudimos cargar esta página' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('link', { name: linkName })).toHaveCount(0);
  state.catalogStatus = 200;
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await toConfirm(page);
  state.postStatus = 404;
  await page.getByRole('button', { name: 'Confirmar reserva', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Esta página no está disponible' })).toBeVisible();
  await expect(page.getByRole('link', { name: linkName })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
  expect(state.posts).toBe(1);
  expect(state.destinations).toHaveLength(0);
});

test('C2 real browser popup denial: sandbox blocks native link, success remains and retry creates no booking', async ({ page, context, baseURL }, info) => {
  const state = await fixture(context);
  const blocked: string[] = [];
  page.on('console', (entry) => {
    if (/Blocked opening.*sandboxed.*allow-popups/i.test(entry.text())) blocked.push(entry.text());
  });
  await page.goto('/qa-whatsapp-a');
  // Chrome enforces this sandbox. No stub/override of window.open or link activation.
  await page.setContent(`<iframe title="QA popup policy" sandbox="allow-scripts allow-same-origin allow-forms" src="${baseURL}/qa-whatsapp-a" style="width:100%;height:900px;border:0"></iframe>`);
  const frame = page.frameLocator('iframe');
  await toConfirm(frame);
  await success(frame);
  const link = frame.getByRole('link', { name: linkName });
  await link.click();
  await expect.poll(() => blocked.length).toBe(1);
  await expect(frame.getByRole('status')).toHaveText('Tu reserva quedó registrada');
  await link.press('Enter');
  await expect.poll(() => blocked.length).toBe(2);
  expect(context.pages()).toHaveLength(1);
  expect(state.destinations).toHaveLength(0);
  expect(state.posts).toBe(1);
  await frame.getByRole('status').locator('..').screenshot({ path: info.outputPath('popup-blocked.png') });
  await info.attach('browser-popup-denial.txt', { body: blocked.join('\n'), contentType: 'text/plain' });
  // The action remains available after denial. Unrestricted opening is covered separately;
  // we do not claim to detect browser policy, app installation, sending or delivery.
});
