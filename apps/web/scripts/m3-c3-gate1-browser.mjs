// C3 gate 1: production CalendarScreen/client against the unmodified compiled API/AppModule. Only identity context is local; every API response is real PostgreSQL HTTP.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { createServer as createNetServer } from 'node:net';
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
const evidenceRoot = process.env.M3_GATE1_EVIDENCE;
assert(evidenceRoot && new URL(process.env.DATABASE_URL).hostname === '127.0.0.1');
assert(new URL(process.env.M3_GATE1_MIGRATOR_URL).hostname === '127.0.0.1');
const out = path.join(evidenceRoot, 'browser');
const portProbe = createNetServer();
await new Promise(r => portProbe.listen(0, '127.0.0.1', r));
const apiPort = portProbe.address().port;
await new Promise(r => portProbe.close(r));
const apiOrigin = 'http://127.0.0.1:' + apiPort;
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
    'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(apiOrigin),
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
            "import {useState,createContext,useContext,useEffect} from 'react';import {configureApiAuth} from '@/lib/api';const Context=createContext(null);let current;configureApiAuth(async()=>({token:current?.token??null,organizationId:current?.organizationId??null}));export function Harness({children}){const [user,setUser]=useState(window.gateSessions.A);current=user;useEffect(()=>{window.m3SetUser=setUser;},[]);return <Context.Provider value={{user}}>{children}</Context.Provider>;}export const useAuth=()=>useContext(Context);",
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
  '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><title>M3 C3 local real API</title><body class="dashboard-shell"><main style="padding:16px;max-width:1600px;margin:auto"><div id="root"></div></main><script src="/app.js"></script></body></html>';
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
const { PrismaClient } = createRequire(path.join(root, 'apps/api/package.json'))('@prisma/client');
const { JwtService } = createRequire(path.join(root, 'apps/api/package.json'))('@nestjs/jwt');
const db = new PrismaClient({ datasources: { db: { url: process.env.M3_GATE1_MIGRATOR_URL } } });
const jwt = new JwtService({ secret: process.env.JWT_SECRET });
const digest = value => createHash('sha256').update(String(value)).digest('hex');
const trace = [], cases = [], failures = [], sessions = new Map();
let browser, apiProcess, apiLogs = '', sequence = 0;
function summary(data) {
  if (!data || typeof data !== 'object') return null;
  return {
    ...(data.revision ? { revisionSha256: digest(data.revision), updatedAt: data.updatedAt } : {}),
    ...(data.nextCursor ? { nextCursorSha256: digest(data.nextCursor) } : {}),
    ...(data.items ? { count: data.items.length, itemIdHashes: data.items.map(x => digest(x.id)) } : {}),
    ...(data.slots ? { slotCount: data.slots.length } : {}),
    ...(data.availableDates ? { dayCount: data.availableDates.length } : {}),
  };
}
function record(url, method, token, status, data, body, headers, source) {
  const parsed = new URL(url), params = Object.fromEntries(parsed.searchParams);
  if (params.cursor) params.cursor = { sha256: digest(params.cursor), length: params.cursor.length };
  if (params.professionalId) params.professionalId = { sha256: digest(params.professionalId) };
  trace.push({ sequence: ++sequence, source, method, path: parsed.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, '[fixture-id]'), params,
    role: sessions.get(token)?.role ?? 'ANONYMOUS', organizationSha256: sessions.get(token)?.organizationId ? digest(sessions.get(token).organizationId) : null,
    sessionTokenSha256: token ? digest(token) : null, status, response: summary(data),
    ...(body ? { command: { startTime: body.startTime, expectedUpdatedAt: body.expectedUpdatedAt, expectedRevisionSha256: body.expectedRevision ? digest(body.expectedRevision) : null, fields: Object.keys(body) } } : {}),
    cacheControl: headers['cache-control'] ?? null, retryAfter: headers['retry-after'] ?? null,
  });
}
async function call(session, path, method = 'GET', body) {
  const url = apiOrigin + path;
  const response = await fetch(url, { method, headers: { 'content-type': 'application/json', ...(session ? { authorization: 'Bearer ' + session.token, 'x-organization-id': session.organizationId } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  record(url, method, session?.token, response.status, data, body, Object.fromEntries(response.headers), 'operator-real-http');
  return { status: response.status, data, headers: response.headers };
}
async function fixture(label, role = 'OWNER', fill = false) {
  const org = await db.organization.create({ data: { name: 'Synthetic local ' + label, slug: randomUUID(), email: randomUUID() + '@test.invalid', timeZone: 'America/Santo_Domingo', businessSchedule: { create: { state: 'CONFIRMED', zoneConfirmed: true, days: { create: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, windows: { create: [{ startMinute: 540, endMinute: 1140 }] } })) } } } } });
  async function actor(actorRole) {
    const user = await db.user.create({ data: { name: 'Synthetic actor', email: randomUUID() + '@test.invalid', memberships: { create: { organizationId: org.id, role: actorRole } } } });
    const token = jwt.sign({ sub: user.id, organizationId: org.id, role: actorRole }, { expiresIn: '1h' });
    const session = { id: user.id, name: user.name, role: actorRole, organizationId: org.id, token };
    sessions.set(token, session); return session;
  }
  const session = await actor(role), operator = await actor('ADMIN');
  const professional = await db.professional.create({ data: { organizationId: org.id, name: 'Synthetic professional', status: 'ACTIVE', ...(role === 'BARBER' ? { userId: session.id } : {}) } });
  const service = await db.service.create({ data: { organizationId: org.id, name: 'Synthetic service', duration: 30, price: 1 } });
  const client = await db.client.create({ data: { organizationId: org.id, name: 'Synthetic target ' + label } });
  const booking = await db.booking.create({ data: { organizationId: org.id, professionalId: professional.id, clientId: client.id, serviceId: service.id, startTime: new Date('2099-01-02T13:10:00Z'), endTime: new Date('2099-01-02T13:40:00Z') } });
  if (fill) {
    const second = await db.professional.create({ data: { organizationId: org.id, name: 'Synthetic second professional', status: 'ACTIVE' } });
    const filler = await db.client.create({ data: { organizationId: org.id, name: 'Synthetic pagination client' } });
    await db.booking.createMany({ data: Array.from({ length: 105 }, (_, i) => ({ organizationId: org.id, professionalId: second.id, clientId: filler.id, serviceId: service.id, startTime: new Date(Date.parse('2099-01-02T14:00:00Z') + i * 1800000), endTime: new Date(Date.parse('2099-01-02T14:30:00Z') + i * 1800000), status: 'COMPLETED' })) });
  }
  return { session, operator, org, booking, client, professional };
}
async function open(f, width = 1440, extra = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Asia/Tokyo', reducedMotion: 'reduce' });
  const page = await context.newPage(), observed = [], consoleIssues = [], expectedNetwork = [];
  page.setDefaultTimeout(12000);
  await page.clock.install({ time: new Date('2099-01-01T12:00:00Z') });
  await page.addInitScript(config => { window.gateSessions = config; }, { A: f.session, ...extra });
  await context.route('**/*', route => {
    const host = new URL(route.request().url()).hostname;
    assert.equal(host, '127.0.0.1', 'Browser external destination prohibited');
    return route.continue();
  });
  page.on('pageerror', e => consoleIssues.push(e.name));
  page.on('console', m => {
    if (!['warning', 'error'].includes(m.type())) return;
    if (/Failed to load resource: the server responded with a status of (400|401|403|404|409|429|503)/.test(m.text())) expectedNetwork.push(m.text());
    else consoleIssues.push(m.text());
  });
  page.on('response', async response => {
    const req = response.request();
    if (!req.url().startsWith(apiOrigin) || req.method() === 'OPTIONS') return;
    const data = await response.json().catch(() => null), headers = await response.allHeaders();
    const token = (req.headers().authorization ?? '').replace(/^Bearer /, '');
    const body = req.postData() ? req.postDataJSON() : null;
    observed.push({ url: new URL(req.url()), method: req.method(), status: response.status(), data, body, headers });
    record(req.url(), req.method(), token, response.status(), data, body, headers, 'browser-real-http');
  });
  await page.goto(origin);
  await expect(page.getByText(f.client.name, { exact: true })).toBeVisible();
  return { context, page, observed, consoleIssues, expectedNetwork };
}
async function select(ctx, f, day = '2 de enero de 2099') {
  await ctx.page.getByText(f.client.name, { exact: true }).click();
  await ctx.page.getByRole('button', { name: 'Reprogramar', exact: true }).click();
  await ctx.page.getByRole('button', { name: day, exact: true }).click();
  await ctx.page.getByRole('button', { name: '10:30 a. m.', exact: true }).click();
}
async function close(ctx, name) {
  await expect.poll(() => ctx.consoleIssues).toEqual([]);
  const overflow = await ctx.page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert(overflow.scroll <= overflow.width + 1);
  await ctx.page.screenshot({ path: path.join(out, name + '.png') });
  await ctx.context.close();
  return { overflow, consoleIssues: ctx.consoleIssues, expectedNetwork: ctx.expectedNetwork };
}
async function test(name, run) {
  const start = trace.length;
  try { const evidence = await run(); cases.push({ name, passed: true, requestCount: trace.length - start, ...evidence }); }
  catch (e) { failures.push({ name, error: e.message }); cases.push({ name, passed: false, requestCount: trace.length - start }); throw e; }
}
try {
  apiProcess = spawn(process.execPath, [path.join(root, 'apps/api/dist/main.js')], { cwd: path.join(root, 'apps/api'), env: { ...process.env, HOST: '127.0.0.1', PORT: String(apiPort), CORS_ALLOWED_ORIGINS: origin, NODE_ENV: 'test', REQUIRE_INTERNAL_MFA: 'false', NOTIFICATIONS_EMAIL_ENABLED: 'false' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  apiProcess.stdout.on('data', b => { apiLogs += b.toString(); }); apiProcess.stderr.on('data', b => { apiLogs += b.toString(); });
  let ready = false;
  for (let i = 0; i < 200 && !ready; i++) {
    if (apiProcess.exitCode !== null) throw new Error('Full API exited before readiness');
    try { ready = (await fetch(apiOrigin + '/bookings/calendar?from=2099-01-01&to=2099-01-02')).status === 401; } catch { /* wait for local listener */ }
    if (!ready) await new Promise(r => setTimeout(r, 100));
  }
  assert(ready, 'Full compiled API readiness');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const width of [375, 1440]) await test('persisted-flow-' + width, async () => {
    const f = await fixture('flow-' + width), ctx = await open(f, width);
    try {
      await select(ctx, f);
      await ctx.page.getByRole('button', { name: '3 de enero de 2099', exact: true }).click();
      await expect(ctx.page.getByRole('button', { name: '10:30 a. m.', exact: true })).toBeVisible();
      await ctx.page.getByRole('button', { name: '2 de enero de 2099', exact: true }).click();
      await ctx.page.getByRole('button', { name: '10:30 a. m.', exact: true }).click();
      await ctx.page.screenshot({ path: path.join(out, 'selector-' + width + '.png') });
      assert.equal(ctx.observed.filter(x => x.url.pathname.endsWith('reschedule-availability')).length, 2, 'per-date cache reuses date2');
      const slots = ctx.observed.filter(x => x.url.pathname.endsWith('reschedule-availability')).find(x => x.url.searchParams.get('date') === '2099-01-02').data;
      await expect(ctx.page.getByRole('button', { name: '9:10 a. m.', exact: true })).toBeDisabled();
      const detail = ctx.observed.find(x => x.url.pathname === '/bookings/' + f.booking.id).data;
      assert.deepEqual(Object.keys(detail).sort(), ['client','endTime','id','professional','revision','service','startTime','status','updatedAt'].sort());
      assert.deepEqual(Object.keys(detail.client), ['name']);
      assert.deepEqual(Object.keys(detail.service).sort(), ['id','name']);
      const result = ctx.page.waitForResponse(r => r.request().method() === 'PATCH');
      await ctx.page.getByRole('button', { name: 'Confirmar nuevo horario' }).click();
      assert.equal((await result).status(), 200);
      await expect(ctx.page.getByText('Reserva reagendada. El profesional, el servicio y el estado se conservaron.')).toBeVisible();
      const write = ctx.observed.find(x => x.method === 'PATCH');
      assert.deepEqual(write.body, { startTime: '2099-01-02T14:30:00.000Z', expectedUpdatedAt: slots.updatedAt, expectedRevision: slots.revision });
      const after = await db.booking.findUniqueOrThrow({ where: { id: f.booking.id } });
      assert.equal(after.startTime.toISOString(), write.body.startTime);
      assert.equal(await db.bookingEmailEvent.count({ where: { bookingId: f.booking.id } }), 1);
      return { ...(await close(ctx, 'flow-' + width)), tokensCopiedExactly: true, sameInstantDisabled: true, minimumProjectionVerified: true, slotInstantCopiedExactly: true, slotReads: 2, persisted: true, eventCount: 1 };
    } finally { await ctx.context.close(); }
  });
  for (const role of ['ADMIN', 'RECEPTIONIST', 'BARBER']) await test('role-' + role, async () => {
    const f = await fixture('role-' + role, role), ctx = await open(f, 375);
    try {
      await ctx.page.getByText(f.client.name, { exact: true }).click();
      await expect(ctx.page.getByRole('dialog')).toBeVisible();
      if (role === 'BARBER') {
        await expect(ctx.page.getByRole('button', { name: 'Reprogramar', exact: true })).toHaveCount(0);
        assert.equal(ctx.observed.filter(x => x.url.pathname === '/professionals' || x.url.pathname.includes('availability')).length, 0);
        assert.equal((await call(f.session, '/bookings/' + f.booking.id + '/reschedule-availability?date=2099-01-02')).status, 403);
        assert.equal((await call(f.session, '/bookings/' + f.booking.id + '/reschedule', 'PATCH', { startTime: '2099-01-02T14:30:00Z' })).status, 403);
      } else {
        await ctx.page.getByRole('button', { name: 'Reprogramar', exact: true }).click();
        await ctx.page.getByRole('button', { name: '2 de enero de 2099', exact: true }).click();
        await expect(ctx.page.getByRole('button', { name: '10:30 a. m.', exact: true })).toBeVisible();
      }
      return { ...(await close(ctx, 'role-' + role)), backendRoleEnforced: true };
    } finally { await ctx.context.close(); }
  });
  await test('cursor-pages-and-real-409', async () => {
    const f = await fixture('cursor', 'OWNER', true);
    let ctx = await open(f);
    try {
      const first = ctx.observed.find(x => x.url.pathname === '/bookings/calendar').data;
      assert.equal(first.items.length, 100); assert(first.nextCursor);
      await ctx.page.getByRole('button', { name: 'Cargar más citas' }).click();
      await expect.poll(() => ctx.observed.filter(x => x.url.pathname === '/bookings/calendar').length).toBe(2);
      const second = ctx.observed.filter(x => x.url.pathname === '/bookings/calendar')[1];
      assert.equal(second.url.searchParams.get('cursor'), first.nextCursor); assert.equal(second.status, 200);
      assert.equal(new Set([...first.items, ...second.data.items].map(x => x.id)).size, 106);
      await ctx.context.close();ctx = await open(f);
      const detail = (await call(f.operator, '/bookings/' + f.booking.id)).data;
      assert.equal((await call(f.operator, '/bookings/' + f.booking.id + '/reschedule', 'PATCH', { startTime: '2099-01-03T14:30:00Z', expectedUpdatedAt: detail.updatedAt, expectedRevision: detail.revision })).status, 200);
      await ctx.page.getByRole('button', { name: 'Cargar más citas' }).click();
      await expect(ctx.page.getByRole('alert')).toContainText('cambió');
      await expect(ctx.page.getByText(f.client.name, { exact: true })).toHaveCount(0);
      await ctx.page.getByRole('button', { name: 'Recargar agenda desde el inicio' }).click();
      await expect(ctx.page.getByText(f.client.name, { exact: true })).toBeVisible();
      await expect.poll(() => ctx.observed.filter(x => x.url.pathname === '/bookings/calendar').at(-1).url.searchParams.has('cursor')).toBe(false);
      return { ...(await close(ctx, 'cursor409')), cursorCopiedExactly: true, uniqueRows: 106, conflictAfterRealOtherOperator: true, resetWithoutCursor: true };
    } finally { await ctx.context.close(); }
  });
  await test('stale-command-409-origin-intact', async () => {
    const f = await fixture('stale'), ctx = await open(f);
    try {
      await select(ctx, f);
      const before = (await call(f.operator, '/bookings/' + f.booking.id)).data;
      await call(f.operator, '/bookings/' + f.booking.id + '/reschedule', 'PATCH', { startTime: '2099-01-03T14:30:00Z', expectedUpdatedAt: before.updatedAt, expectedRevision: before.revision });
      const result = ctx.page.waitForResponse(r => r.request().method() === 'PATCH');
      await ctx.page.getByRole('button', { name: 'Confirmar nuevo horario' }).click();
      assert.equal((await result).status(), 409);
      await expect(ctx.page.getByRole('alert')).toContainText('cambió');
      assert.equal((await db.booking.findUniqueOrThrow({ where: { id: f.booking.id } })).startTime.toISOString(), '2099-01-03T14:30:00.000Z');
      assert.equal(await db.bookingEmailEvent.count({ where: { bookingId: f.booking.id } }), 1);
      return { ...(await close(ctx, 'stale409')), winnerPreserved: true, loserEventCount: 0 };
    } finally { await ctx.context.close(); }
  });
  await test('availability-budget-real-429', async () => {
    const f = await fixture('budget'), ctx = await open(f);
    try {
      for (let i = 0; i < 30; i++) assert.equal((await call(f.session, '/bookings/' + f.booking.id + '/reschedule-availability?date=2099-01-02')).status, 200);
      await ctx.page.getByText(f.client.name, { exact: true }).click();
      await ctx.page.getByRole('button', { name: 'Reprogramar', exact: true }).click();
      await expect(ctx.page.getByRole('alert')).toContainText('Espera');
      await expect(ctx.page.getByRole('button', { name: 'Revisar reserva', exact: true })).toBeDisabled();
      const denied = ctx.observed.find(x => x.status === 429);assert(denied);
      assert.equal(denied.headers['cache-control'], 'no-store');assert(Number(denied.headers['retry-after']) > 0);
      const count = trace.length;await ctx.page.waitForTimeout(1500);assert.equal(trace.length, count, 'No automatic retry');
      return { ...(await close(ctx, 'budget429')), allowed: 30, rejected31st: true, backendRetryAfter: Number(denied.headers['retry-after']), retryAfterCorsExposed: /(?:^|,)\s*Retry-After\s*(?:,|$)/i.test(denied.headers['access-control-expose-headers'] ?? ''), clientUsesConservativeFallback60: true, automaticRetries: 0 };
    } finally { await ctx.context.close(); }
  });
  await test('tenants-roles-visit-A-B-A-and-404', async () => {
    const a = await fixture('tenant-A'), b = await fixture('tenant-B'), ctx = await open(a, 375, { B: b.session });
    try {
      const oldReads = ctx.observed.filter(x => x.url.pathname === '/bookings/calendar').length;
      await ctx.page.evaluate(() => window.m3SetUser(window.gateSessions.B));
      await expect(ctx.page.getByText(b.client.name, { exact: true })).toBeVisible();
      await expect(ctx.page.getByText(a.client.name, { exact: true })).toHaveCount(0);
      await ctx.page.evaluate(() => window.m3SetUser(window.gateSessions.A));
      await expect(ctx.page.getByText(a.client.name, { exact: true })).toBeVisible();
      assert(ctx.observed.filter(x => x.url.pathname === '/bookings/calendar').length >= oldReads + 2);
      const foreign = await call(a.session, '/bookings/' + b.booking.id), absent = await call(a.session, '/bookings/' + randomUUID());
      assert.equal(foreign.status, 404);assert.equal(absent.status, 404);assert.equal(foreign.data.message, absent.data.message);
      assert.equal((await call(null, '/bookings/calendar?from=2099-01-01&to=2099-01-02')).status, 401);
      assert.equal((await call(a.session, '/bookings/' + a.booking.id + '/reschedule', 'PATCH', { startTime: '2099-01-02T14:30:00Z' })).status, 400);
      assert.equal(await db.bookingEmailEvent.count({ where: { bookingId: a.booking.id } }), 0);
      return { ...(await close(ctx, 'isolation')), distinctRealTenantRequests: true, newVisitReads: true, uniform404: true, anonymous401: true };
    } finally { await ctx.context.close(); }
  });

  await test('day-week-and-real-filters', async () => {
    const f = await fixture('filters'), ctx = await open(f, 375);
    try {
      await ctx.page.getByLabel('Estado', { exact: true }).selectOption('CONFIRMED');
      await expect(ctx.page.getByText(f.client.name, { exact: true })).toHaveCount(0);
      await expect.poll(() => ctx.observed.filter(x => x.url.pathname === '/bookings/calendar').at(-1).url.searchParams.get('status')).toBe('CONFIRMED');
      await ctx.page.getByLabel('Estado', { exact: true }).selectOption('PENDING');
      await expect(ctx.page.getByText(f.client.name, { exact: true })).toBeVisible();
      await ctx.page.getByRole('button', { name: 'Día', exact: true }).click();
      await expect.poll(() => ctx.observed.filter(x => x.url.pathname === '/bookings/calendar').at(-1).url.searchParams.get('to')).toBe('2099-01-02');
      await ctx.page.getByRole('button', { name: 'Periodo siguiente', exact: true }).click();
      await expect(ctx.page.getByText(f.client.name, { exact: true })).toBeVisible();
      await ctx.page.getByLabel('Profesional', { exact: true }).selectOption(f.professional.id);
      await expect.poll(() => ctx.observed.filter(x => x.url.pathname === '/bookings/calendar').at(-1).url.searchParams.get('professionalId')).toBe(f.professional.id);
      return { ...(await close(ctx, 'filters')), allFiltersUsedRealHTTP: true };
    } finally { await ctx.context.close(); }
  });
  for (const kind of ['read', 'write']) await test('late-real-' + kind + '-identity-switch', async () => {
    const a = await fixture('late-A-' + kind), b = await fixture('late-B-' + kind), ctx = await open(a, 375, { B: b.session });
    let release, reached;
    const held = new Promise(r => { release = r; }), received = new Promise(r => { reached = r; });
    let responseSha256;
    const pattern = kind === 'read' ? '**/bookings/calendar**' : '**/bookings/*/reschedule';
    try {
      if (kind === 'write') await select(ctx, a);
      await ctx.context.route(pattern, async route => {
        if (route.request().headers().authorization !== 'Bearer ' + a.session.token) return route.continue();
        // Send exactly this request to the real API, then pause its unchanged response.
        const response = await route.fetch();
        const raw = await response.body();responseSha256 = digest(raw);
        record(route.request().url(), route.request().method(), a.session.token, response.status(), JSON.parse(raw.toString()), route.request().postData() ? route.request().postDataJSON() : null, response.headers(), 'browser-delayed-real-http');
        reached();await held;
        try { await route.fulfill({ response }); } catch { /* the old visit aborts its request */ }
      });
      if (kind === 'read') await ctx.page.getByLabel('Estado', { exact: true }).selectOption('PENDING');
      else await ctx.page.getByRole('button', { name: 'Confirmar nuevo horario' }).click();
      await received;
      await ctx.page.evaluate(() => window.m3SetUser(window.gateSessions.B));
      await expect(ctx.page.getByText(b.client.name, { exact: true })).toBeVisible();
      release();await ctx.page.waitForTimeout(300);
      await expect(ctx.page.getByText(a.client.name, { exact: true })).toHaveCount(0);
      await expect(ctx.page.getByText('Reserva reagendada. El profesional, el servicio y el estado se conservaron.')).toHaveCount(0);
      await ctx.context.unroute(pattern);
      await ctx.page.evaluate(() => window.m3SetUser(window.gateSessions.A));
      await expect(ctx.page.getByText(a.client.name, { exact: true })).toBeVisible();
      if (kind === 'write') {
        assert.equal((await db.booking.findUniqueOrThrow({ where: { id: a.booking.id } })).startTime.toISOString(), '2099-01-02T14:30:00.000Z');
        assert.equal(await db.bookingEmailEvent.count({ where: { bookingId: a.booking.id } }), 1);
        assert.equal(await db.bookingEmailEvent.count({ where: { bookingId: b.booking.id } }), 0);
      }
      return { ...(await close(ctx, 'late-' + kind)), delayedRealResponseSha256: responseSha256, responseBodyAltered: false, visitAtoBtoA: true, oldSuccessDidNotLeak: true, persistedWriteIsNotCancelled: kind === 'write' };
    } finally { release();await ctx.context.close(); }
  });
  await test('real-db-permission-failure-503', async () => {
    const f = await fixture('unavailable'), ctx = await open(f, 375);
    try {
      // Only this disposable cluster. The production CalendarService/read and HTTP filter remain intact.
      await db.$executeRawUnsafe('REVOKE SELECT ON "Booking" FROM kortek_runtime');
      await ctx.page.getByLabel('Estado', { exact: true }).selectOption('CONFIRMED');
      await expect(ctx.page.getByRole('alert')).toContainText('No pudimos consultar el negocio');
      await expect.poll(() => ctx.observed.some(x => x.url.pathname === '/bookings/calendar' && x.status === 503)).toBe(true);
      return { ...(await close(ctx, 'unavailable503')), actualPostgresPermissionFailure: true, fakeResponse: false };
    } finally {
      await db.$executeRawUnsafe('GRANT SELECT ON "Booking" TO kortek_runtime');
      await ctx.context.close();
    }
  });

} catch (e) {
  process.exitCode = 1;
  if (!failures.length) failures.push({ name: 'bootstrap', error: e.message });
} finally {
  await browser?.close();
  apiProcess?.kill();
  if (apiProcess && apiProcess.exitCode === null) await new Promise(r => { apiProcess.once('exit', r); setTimeout(r, 2000); });
  await new Promise(r => server.close(r));await db.$disconnect();
  const sanitize = text => String(text).replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[session omitted]').replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[local database omitted]');
  writeFileSync(path.join(evidenceRoot, 'full-api-startup.log'), sanitize(apiLogs));
  writeFileSync(path.join(evidenceRoot, 'requests.json'), JSON.stringify(trace, null, 2));
  writeFileSync(path.join(evidenceRoot, 'integration.json'), JSON.stringify({ date: '2026-10-11', api: 'Unmodified dist/main.js bootstrap AppModule, real Guards/Prisma/transaction/budgets', web: 'C2 production CalendarScreen, client, QueryClient and CSS; standalone bundle, local identity context only', auth: 'real locally signed JWT, real DB Membership revalidation; no Clerk/provider', transportMocks: false, apiOrigin, browserOrigin: origin, passed: cases.filter(x => x.passed).length, failed: failures.length, cases, failures: failures.map(x => ({ name: x.name, error: sanitize(x.error) })), requests: trace.length, browserClosed: true, apiClosed: true, noExternalDestinations: true }, null, 2));
  console.log(JSON.stringify({ passed: cases.filter(x => x.passed).length, failed: failures.length, requests: trace.length, cleanup: true }));
}
