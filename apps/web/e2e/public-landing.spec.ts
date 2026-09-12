import { expect, test } from '@playwright/test';

test('la portada pública carga su navegación y CTA sin desbordamiento', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu barbería');
  await expect(page.getByRole('link', { name: 'Registra tu barbería' }).first()).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  expect(pageErrors).toEqual([]);
});

test('la navegación móvil es operable con teclado y expone el acceso', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Caso exclusivo de 375 px');

  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Abrir menú' });
  await menu.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('button', { name: 'Cerrar menú' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Iniciar sesión' }).last()).toBeVisible();
  await expect(page.locator('#landing-mobile-menu')).toBeVisible();
});
