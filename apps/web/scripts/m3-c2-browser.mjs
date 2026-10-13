// Browser-only fixture: real Chrome, production components/HTTP client, controlled contract transport. No live QA/provider.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  root = path.resolve(web, '../..');
const require = createRequire(path.join(web, 'package.json')),
  viteRequire = createRequire(
    createRequire(require.resolve('vitest/package.json')).resolve('vite'),
  );
const { build } = viteRequire('esbuild'),
  postcss = createRequire(require.resolve('@tailwindcss/postcss'))('postcss'),
  tailwind = require('@tailwindcss/postcss'),
  { chromium, expect } = require('@playwright/test');
const out = process.env.M3_BROWSER_OUTPUT || path.join(root, 'docs/quality/evidence/m3-calendario-c2/browser');
mkdirSync(out, { recursive: true });
const styles = await postcss([tailwind({ base: web })]).process(
  readFileSync(path.join(web, 'app/globals.css'), 'utf8'),
  { from: path.join(web, 'app/globals.css') },
);
const entry =
  "import {createRoot} from 'react-dom/client'; import {QueryClient,QueryClientProvider} from '@tanstack/react-query'; import CalendarScreen from '@/components/calendar/CalendarScreen'; import {Harness} from '@/lib/auth-context'; const client=new QueryClient({defaultOptions:{queries:{retry:false}}});window.m3Cache=client;createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><Harness><CalendarScreen/></Harness></QueryClientProvider>);";
const bundle = await build({
  stdin: { contents: entry, loader: 'tsx', resolveDir: web },
  bundle: true,
  write: false,
  outfile: 'app.js',
  jsx: 'automatic',
  format: 'iife',
  define: {
    'process.env': '{}',
    'process.env.NEXT_PUBLIC_API_URL': JSON.stringify('http://127.0.0.1:31999'),
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  plugins: [
    {
      name: 'm3-test-only',
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/auth-context$/ }, () => ({
          path: 'auth-fixture',
          namespace: 'fixture',
        }));
        b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
          loader: 'tsx',
          resolveDir: web,
          contents:
            "import {useState,createContext,useContext,useEffect} from 'react';import {configureApiAuth} from '@/lib/api';const Context=createContext(null);let current;configureApiAuth(async()=>({token:'synthetic-local-session',organizationId:current?.organizationId??null}));export function Harness({children}){const [user,setUser]=useState({id:'actor',name:'Synthetic actor',role:new URLSearchParams(location.search).get('role')??'OWNER',organizationId:'A'});current=user;useEffect(()=>{window.m3SetUser=setUser;},[]);return <Context.Provider value={{user}}>{children}</Context.Provider>;}export const useAuth=()=>useContext(Context);",
        }));
        b.onResolve({ filter: /^@\// }, (args) => {
          const base = path.join(web, args.path.slice(2));
          for (const ext of ['', '.ts', '.tsx', '.js']) {
            try {
              readFileSync(base + ext);
              return { path: base + ext };
            } catch {
              /* try extension */
            }
          }
        });
      },
    },
  ],
});
const js = bundle.outputFiles[0].contents;
const html =
  '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><title>M3 C2 local fixture</title><body class="dashboard-shell"><main style="padding:16px;max-width:1600px;margin:auto"><div id="root"></div></main><script src="/app.js"></script></body></html>';
const server = createServer((req, res) => {
  res.setHeader(
    'Content-Type',
    req.url === '/app.js'
      ? 'application/javascript'
      : req.url === '/style.css'
        ? 'text/css'
        : 'text/html',
  );
  res.end(req.url === '/app.js' ? js : req.url === '/style.css' ? styles.css : html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
const revision = 'm3.' + 'a'.repeat(64),
  updatedAt = '2026-10-10T10:00:00.123Z';
const booking = (tenant = 'A', id = 'one') => ({
  id,
  startTime: '2026-10-12T14:10:00.000Z',
  endTime: '2026-10-12T14:40:00.000Z',
  status: 'PENDING',
  updatedAt,
  revision,
  client: { name: 'Synthetic ' + tenant + ' ' + id },
  professional: { id: 'professional', name: 'Synthetic professional' },
  service: { id: 'service', name: 'Synthetic service' },
});
let browser;
const results = [],
  failures = [];
async function scenario(name, width, role, run) {
  const context = await browser.newContext({
      viewport: { width, height: 900 },
      timezoneId: 'Asia/Tokyo',
      reducedMotion: 'reduce',
    }),
    page = await context.newPage();
  page.setDefaultTimeout(8000);
  await page.clock.install({ time: new Date('2026-10-12T12:00:00Z') });
  const requests = [],
    consoleIssues = [],
    expectedNetwork = [];
  const state = {
    patchStatus: 200,
    pageStatus: 200,
    slotStatus: 200,
    pageConflict: false,
    delayPatch: null,
    delayPage: null,
    empty: false,
  };
  page.on('pageerror', (e) => consoleIssues.push(e.message));
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) {
      if (
        /^Failed to load resource: the server responded with a status of (400|401|403|404|409|429|503)/.test(
          m.text(),
        )
      )
        expectedNetwork.push(m.text());
      else consoleIssues.push(m.text());
    }
  });
  await context.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.origin === origin) return route.continue();
    assert.equal(url.origin, 'http://127.0.0.1:31999', 'No external network');
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': 'authorization,content-type,x-organization-id',
      'access-control-allow-methods': 'GET,PATCH,OPTIONS',
      'cache-control': 'no-store',
      'access-control-expose-headers': 'Retry-After,X-Total-Pages',
      'retry-after': '2',
    };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const tenant = req.headers()['x-organization-id'];
    const record = {
      method: req.method(),
      path: url.pathname,
      params: Object.fromEntries(url.searchParams),
      tenant,
      body: req.postDataJSON(),
    };
    requests.push(record);
    let status = 200,
      data;
    if (url.pathname === '/organizations/mine')
      data = {
        id: tenant,
        name: 'Synthetic business',
        slug: 'synthetic',
        timeZone: 'America/Santo_Domingo',
      };
    else if (url.pathname === '/professionals')
      data = [{ id: 'professional', name: 'Synthetic professional' }];
    else if (url.pathname === '/bookings/calendar') {
      status = state.pageStatus;
      if (record.params.cursor && state.pageConflict) {
        status = 409;
        state.pageConflict = false;
      }
      if (state.delayPage && tenant === 'A') await state.delayPage;
      data = {
        timeZone: 'America/Santo_Domingo',
        from: record.params.from,
        to: record.params.to,
        rangeStart: record.params.from + 'T04:00:00.000Z',
        rangeEnd: record.params.to + 'T04:00:00.000Z',
        generatedAt: '2026-10-12T12:00:00Z',
        items: state.empty ? [] : [booking(tenant, record.params.cursor ? 'two' : 'one')],
        nextCursor: record.params.cursor ? null : 'opaque-fixture-cursor',
      };
    } else if (url.pathname.endsWith('/reschedule-availability-days'))
      data = {
        bookingId: 'one',
        updatedAt,
        revision,
        timeZone: 'America/Santo_Domingo',
        from: record.params.from,
        to: record.params.to,
        availableDates: ['2026-10-13', '2026-10-14'],
      };
    else if (url.pathname.endsWith('/reschedule-availability')) {
      status = state.slotStatus;
      data = {
        bookingId: 'one',
        updatedAt,
        revision,
        timeZone: 'America/Santo_Domingo',
        date: record.params.date,
        slots: [
          {
            startTime: record.params.date + 'T14:30:00.000Z',
            endTime: record.params.date + 'T15:00:00.000Z',
          },
        ],
      };
    } else if (url.pathname.endsWith('/reschedule')) {
      status = state.patchStatus;
      if (state.delayPatch) await state.delayPatch;
      data = {
        id: 'one',
        startTime: record.body.startTime,
        endTime: '2026-10-13T15:00:00.000Z',
        updatedAt: '2026-10-12T12:00:01Z',
        revision: 'm3.' + 'b'.repeat(64),
      };
    } else if (url.pathname === '/bookings/one' || url.pathname === '/bookings/two')
      data = booking(tenant, url.pathname.split('/').pop());
    else throw Error('Unexpected contract endpoint ' + url.pathname);
    if (status !== 200) data = { message: 'Synthetic backend detail must not be displayed' };
    await route
      .fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) })
      .catch((e) => {
        if (!/closed|disposed|aborted/i.test(e.message)) throw e;
      });
  });
  try {
    await page.goto(origin + '/?role=' + role);
    await expect(
      page.getByRole('heading', { name: role === 'BARBER' ? 'Mi agenda' : 'Agenda', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Synthetic A one', { exact: true })).toBeVisible();
    await run({ page, requests, state });
    const body = await page.locator('body').innerText();
    assert(!/America\/|UTC|[+-]04:00|Synthetic backend detail/.test(body));
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: innerWidth,
      dialogs: [...document.querySelectorAll('[role="dialog"]')].map((n) => ({
        width: n.scrollWidth,
        client: n.clientWidth,
      })),
    }));
    assert(overflow.document <= overflow.viewport + 1, JSON.stringify(overflow));
    assert(
      overflow.dialogs.every((d) => d.width <= d.client + 1),
      JSON.stringify(overflow),
    );
    assert.deepEqual(consoleIssues, []);
    await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
    results.push({
      name,
      width,
      role,
      passed: true,
      requests,
      overflow,
      consoleIssues,
      expectedNetwork,
    });
  } catch (e) {
    failures.push({ name, error: e.message });
    await page.screenshot({ path: path.join(out, name + '-failed.png'), fullPage: true });
    results.push({ name, width, role, passed: false, requests, consoleIssues });
  } finally {
    await context.close();
  }
}
async function choose({ page }) {
  await page.getByText('Synthetic A one', { exact: true }).click();
  await page.getByRole('button', { name: 'Reprogramar', exact: true }).click();
  await page.getByRole('button', { name: '13 de octubre de 2026' }).click();
  await page.getByRole('button', { name: '10:30 a. m.', exact: true }).click();
}
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  await scenario('today-mobile', 375, 'OWNER', async ({ page, requests }) => {
    await page.getByRole('button', { name: 'Periodo anterior' }).click();
    await expect.poll(() => requests.filter(r => r.path === '/bookings/calendar').at(-1)?.params.from).toBe('2026-10-05');
    await page.getByRole('button', { name: 'Hoy', exact: true }).click();
    await expect.poll(() => requests.filter(r => r.path === '/bookings/calendar').at(-1)?.params.from).toBe('2026-10-12');
    const count = requests.filter(r => r.path === '/bookings/calendar').length;
    await page.getByRole('button', { name: 'Hoy', exact: true }).click();
    await expect.poll(() => requests.filter(r => r.path === '/bookings/calendar').length).toBe(count + 1);
    await expect(page.getByRole('button', { name: 'Semana', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
  for (const width of [320, 375, 768, 1440])
    await scenario('flow-' + width, width, 'OWNER', async (ctx) => {
      const { page, requests } = ctx;
      await choose(ctx);
      await expect(page.getByLabel('Calendario de reprogramación', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: '11 de octubre de 2026, sin horarios disponibles' })).toBeDisabled();
      assert.equal(requests.filter((r) => r.path.endsWith('/reschedule-availability')).length, 1);
      await page.getByRole('button', { name: '14 de octubre de 2026' }).click();
      await expect(page.getByRole('button', { name: '10:30 a. m.' })).toBeVisible();
      await page.getByRole('button', { name: '13 de octubre de 2026' }).click();
      await page.getByRole('button', { name: '10:30 a. m.' }).click();
      assert.equal(requests.filter((r) => r.path.endsWith('/reschedule-availability')).length, 2);
      await page.screenshot({ path: path.join(out, 'selector-' + width + '.png'), fullPage: true });
      await page.getByRole('button', { name: 'Confirmar nuevo horario' }).click();
      await expect(
        page.getByText(
          'Reserva reagendada. El profesional, el servicio y el estado se conservaron.',
        ),
      ).toBeVisible();
      const writes = requests.filter((r) => r.method === 'PATCH');
      assert.equal(writes.length, 1);
      assert.deepEqual(writes[0].body, {
        startTime: '2026-10-13T14:30:00.000Z',
        expectedUpdatedAt: updatedAt,
        expectedRevision: revision,
      });
    });
  for (const role of ['ADMIN', 'RECEPTIONIST', 'BARBER'])
    await scenario('role-' + role, 375, role, async (ctx) => {
      await ctx.page.getByText('Synthetic A one', { exact: true }).click();
      await expect(ctx.page.getByRole('dialog')).toBeVisible();
      if (role === 'BARBER') {
        assert.equal(await ctx.page.getByRole('button', { name: 'Reprogramar' }).count(), 0);
        assert.equal(
          ctx.requests.filter((r) => r.path === '/professionals' || r.path.includes('availability'))
            .length,
          0,
        );
      } else await expect(ctx.page.getByRole('button', { name: 'Reprogramar' })).toBeVisible();
      await ctx.page.getByRole('button', { name: 'Cerrar detalle', exact: true }).focus();
      await ctx.page.keyboard.press('Tab');
      assert.equal(
        await ctx.page.locator('[role=dialog]').evaluate((n) => n.contains(document.activeElement)),
        true,
      );
      await ctx.page.keyboard.press('Escape');
      await expect(ctx.page.getByRole('dialog')).toHaveCount(0);
    });
  await scenario('pages-409', 1440, 'OWNER', async ({ page, state, requests }) => {
    state.pageConflict = true;
    await page.getByRole('button', { name: 'Cargar más citas' }).click();
    await expect(page.getByRole('alert')).toContainText('cambió');
    assert.equal(await page.getByText('Synthetic A one', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Recargar agenda desde el inicio' }).click();
    await expect(page.getByText('Synthetic A one', { exact: true })).toBeVisible();
    assert.equal(
      requests.filter((r) => r.path === '/bookings/calendar').at(-1).params.cursor,
      undefined,
    );
  });
  await scenario('filters-day-week', 375, 'OWNER', async ({ page, requests, state }) => {
    await page.getByRole('button', { name: 'Día', exact: true }).click();
    await page.getByLabel('Estado', { exact: true }).selectOption('CONFIRMED');
    await page.getByLabel('Profesional', { exact: true }).selectOption('professional');
    await expect
      .poll(() => requests.filter((r) => r.path === '/bookings/calendar').at(-1).params)
      .toMatchObject({
        from: '2026-10-12',
        to: '2026-10-13',
        status: 'CONFIRMED',
        professionalId: 'professional',
      });
    state.empty = true;
    await page.getByRole('button', { name: 'Periodo siguiente' }).click();
    await expect(page.getByRole('status')).toContainText('No hay citas con estos filtros');
  });
  for (const status of [400, 401, 403, 404, 409, 429, 503])
    await scenario('write-error-' + status, 375, 'OWNER', async (ctx) => {
      await choose(ctx);
      ctx.state.patchStatus = status;
      await ctx.page.getByRole('button', { name: 'Confirmar nuevo horario' }).click();
      await expect(ctx.page.getByRole('alert')).toBeVisible();
      assert(
        !(await ctx.page
          .getByRole('alert')
          .innerText()
          .then((t) => t.includes('Synthetic backend'))),
      );
      if (status === 429) {
        await expect(ctx.page.getByRole('button', { name: 'Revisar reserva' })).toBeDisabled();
        const count = ctx.requests.filter((r) => r.path.includes('availability')).length;
        await ctx.page.clock.runFor(2100);
        assert.equal(ctx.requests.filter((r) => r.path.includes('availability')).length, count);
        await expect(ctx.page.getByRole('button', { name: 'Revisar reserva' })).toBeEnabled();
      }
    });
  await scenario('scope-ABA-late-write', 375, 'OWNER', async (ctx) => {
    await choose(ctx);
    let release;
    ctx.state.delayPatch = new Promise((r) => {
      release = r;
    });
    await ctx.page.getByRole('button', { name: 'Confirmar nuevo horario' }).click();
    await expect.poll(() => ctx.requests.filter((r) => r.method === 'PATCH').length).toBe(1);
    await ctx.page.evaluate(() =>
      window.m3SetUser({ id: 'other', name: 'Synthetic', organizationId: 'B', role: 'BARBER' }),
    );
    await expect(ctx.page.getByText('Synthetic B one', { exact: true })).toBeVisible();
    release();
    await ctx.page.evaluate(() =>
      window.m3SetUser({ id: 'actor', name: 'Synthetic', organizationId: 'A', role: 'OWNER' }),
    );
    await expect(ctx.page.getByText('Synthetic A one', { exact: true })).toBeVisible();
    assert.equal(await ctx.page.getByRole('dialog').count(), 0);
    assert.equal(await ctx.page.getByText(/Reserva reagendada/).count(), 0);
    assert.equal(
      await ctx.page.evaluate(() =>
        window.m3Cache
          .getQueryCache()
          .getAll()
          .some((q) => String(q.queryKey[1]).includes('"B"')),
      ),
      false,
    );
  });
  await scenario('late-read-after-navigation', 1440, 'OWNER', async (ctx) => {
    let release;
    ctx.state.delayPage = new Promise((r) => {
      release = r;
    });
    await ctx.page.getByRole('button', { name: 'Periodo siguiente' }).click();
    await expect(ctx.page.getByText('Cargando agenda…')).toBeVisible();
    await ctx.page.evaluate(() =>
      window.m3SetUser({ id: 'other', name: 'Synthetic', organizationId: 'B', role: 'OWNER' }),
    );
    await expect(ctx.page.getByText('Synthetic B one', { exact: true })).toBeVisible();
    release();
    await expect(ctx.page.getByText('Synthetic A one', { exact: true })).toHaveCount(0);
  });
} finally {
  if (browser) await browser.close();
  await new Promise((r) => server.close(r));
  writeFileSync(
    path.join(out, 'results.json'),
    JSON.stringify(
      {
        browser: 'Chrome real headless',
        transport: 'Controlled C1 contract fixture; no live API/QA/provider',
        timezone: 'Asia/Tokyo',
        base: 'da77c88',
        results,
        failures,
        closed: true,
      },
      null,
      2,
    ) + '\n',
  );
}
assert.deepEqual(failures, []);
console.log(
  JSON.stringify({
    passed: results.filter((r) => r.passed).length,
    failed: failures.length,
    closed: true,
  }),
);
