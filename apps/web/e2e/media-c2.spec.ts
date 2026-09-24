import { expect, test } from '@playwright/test';

const image = { id: 'image-1', url: '/public/qa-media/media/token.signature', altText: 'Interior iluminado del salón', caption: 'Nuestro espacio', decorative: false };
const media = {
  hero: image,
  gallery: [image],
  services: [{ serviceId: 'service-1', image }],
  professionals: [{ professionalId: 'professional-1', avatar: image }],
  promotions: [{ id: 'promo-1', title: 'Nueva temporada', body: 'Conoce las novedades de nuestro espacio.', image }],
};

test('la proyección pública se muestra sin desbordamiento y se retira por 404', async ({ page, context }, info) => {
  let available = true;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.route('**/public/qa-media/**', async (route) => {
    const url = new URL(route.request().url());
    const headers = { 'access-control-allow-origin': '*', 'cache-control': 'no-store' };
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'content-type' } }); return; }
    if (!available) { await route.fulfill({ status: 404, headers, json: { message: 'No disponible' } }); return; }
    if (url.pathname.endsWith('/booking-data')) { await route.fulfill({ headers, json: {
      minimumBookingDate: '2026-09-23', organization: { name: 'Salón QA', slug: 'qa-media', phone: null, description: 'Prueba controlada de medios.', address: null, googleMapsUrl: null },
      services: [{ id: 'service-1', name: 'Corte', description: null, duration: 30, price: '500.00' }],
      professionals: [{ id: 'professional-1', name: 'Alex', bio: null, avatar: null }],
    } }); return; }
    if (url.pathname.endsWith('/media')) { await route.fulfill({ headers, json: media }); return; }
    await route.fulfill({ headers, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lV8AAAAASUVORK5CYII=', 'base64') });
  });
  await context.route('**/media-proxy/qa-media/*', async (route) => {
    await route.fulfill({ headers: { 'cache-control': 'private, no-store' }, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lV8AAAAASUVORK5CYII=', 'base64') });
  });
  await page.goto('/qa-media');
  await expect(page.getByRole('heading', { name: 'Salón QA' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Galería' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Novedades' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nuestro equipo' })).toBeVisible();
  await expect(page.getByText('Nueva temporada')).toBeVisible();
  const images = page.locator('img[src*="/media-proxy/"]');
  await expect(images).toHaveCount(5);
  for (const item of await images.all()) await item.scrollIntoViewIfNeeded();
  await expect.poll(() => images.evaluateAll((items) => items.every((item) => (item as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/media-c2-${info.project.name}.png`, fullPage: true });
  await info.attach('media-c2-environment.json', { body: JSON.stringify({ viewport: page.viewportSize(), role: 'anonymous', api: 'controlled HTTP projection' }), contentType: 'application/json' });
  available = false;
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Esta página no está disponible' })).toBeVisible();
  await expect(page.getByText('Nueva temporada')).toHaveCount(0);
  expect(errors).toEqual([]);
});
