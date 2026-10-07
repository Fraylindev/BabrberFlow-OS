// Local component validation with controlled transport. No live accounts/providers.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(web, '../..');
const require = createRequire(path.join(web, 'package.json'));
const viteRequire = createRequire(createRequire(require.resolve('vitest/package.json')).resolve('vite'));
const { build } = viteRequire('esbuild');
const postcss = createRequire(require.resolve('@tailwindcss/postcss'))('postcss');
const tailwind = require('@tailwindcss/postcss');
const { chromium, expect } = require('@playwright/test');
const out = path.join(root, 'docs/quality/evidence/reserva-invitado-c2/browser');
mkdirSync(out, { recursive: true });
const styles = await postcss([tailwind({ base: web })]).process(readFileSync(path.join(web, 'app/globals.css'), 'utf8'), { from: path.join(web, 'app/globals.css') });
const entry = `
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth-context';
import { PublicBookingScreen } from '@/components/public/PublicBookingScreen';
import { PublicMiniSite } from '@/components/public/PublicMiniSite';
const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><AuthProvider>{new URLSearchParams(location.search).has('mini') ? <PublicMiniSite slug="guest-fixture"/> : <PublicBookingScreen slug="guest-fixture"/>}</AuthProvider></QueryClientProvider>);
`;
const bundle = await build({
  stdin: { contents: entry, loader: 'tsx', resolveDir: web }, bundle: true, write: false, outfile: path.join(out, 'app.js'), format: 'iife', jsx: 'automatic',
  define: { 'process.env': '{}' },
  plugins: [{ name: 'guest-local-isolation', setup(b) {
    b.onResolve({ filter: /^@clerk\/nextjs$|^next\/navigation$|^next\/link$/ }, args => ({ path: args.path, namespace: 'local-test' }));
    b.onLoad({ filter: /.*/, namespace: 'local-test' }, args => ({ loader: 'tsx', resolveDir: web, contents:
      args.path === '@clerk/nextjs' ? "const signed=new URLSearchParams(location.search).has('role'); const getToken=async()=>signed?'local-synthetic-session':null; export const useAuth=()=>({getToken,isLoaded:true,isSignedIn:signed,signOut:async()=>{},userId:signed?'fixture-user':null,sessionId:signed?'fixture-session':null});" :
      args.path === 'next/navigation' ? "export const usePathname=()=>'/guest-fixture/reservar'; export const useRouter=()=>({push:()=>{},replace:()=>{}});" :
      "export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}" }));
    b.onResolve({ filter: /^@\// }, args => {
      const base = path.join(web, args.path.slice(2));
      for (const ext of ['', '.ts', '.tsx', '.js']) { try { readFileSync(base+ext); return { path: base+ext }; } catch { /* next extension */ } }
    });
  } }],
});
const app = bundle.outputFiles.find(file => !file.path.endsWith('.css'));
const css = styles.css + '\n' + readFileSync(path.join(web, 'components/public/booking.css'), 'utf8');
const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><title>C2 local guest fixture</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
const server = createServer((req, res) => {
  res.setHeader('Content-Type', req.url === '/app.js' ? 'application/javascript' : req.url === '/style.css' ? 'text/css' : 'text/html');
  res.end(req.url === '/app.js' ? app.contents : req.url === '/style.css' ? css : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const reports = [], failures = [];
const scenarios = [{width:320}, {width:375}, {width:390}, {width:768}, {width:1280}, ...['OWNER','ADMIN','RECEPTIONIST','BARBER'].map(role=>({width:1280,role}))];
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const {width,role} of scenarios) {
    const context = await browser.newContext({viewport:{width,height:900},timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const requests=[],errors=[],unexpected=[],metrics=[];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if(message.type()==='error') errors.push(message.text()); });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if(url.hostname==='flagcdn.com') return route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="28"><rect width="40" height="28" fill="#eee"/></svg>'});
      if(url.origin===origin) return route.continue();
      if(url.origin!=='http://localhost:3000'){unexpected.push(url.href);return route.abort();}
      const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'authorization,content-type,x-organization-id','access-control-allow-methods':'GET,POST,OPTIONS'};
      if(route.request().method()==='OPTIONS') return route.fulfill({status:204,headers});
      requests.push({path:url.pathname,method:route.request().method(),payload:route.request().postDataJSON()});
      let json;
      if(url.pathname==='/auth/clerk/bootstrap'&&role) json={state:'READY',user:{id:'fixture-user',name:'Internal fixture'},preferredOrganizationId:'fixture-org',memberships:[{role,organization:{id:'fixture-org',name:'Guest fixture',slug:'guest-fixture'}}]};
      else if(url.pathname==='/public/guest-fixture/booking-data') json={minimumBookingDate:'2026-10-07',timeZone:'America/Santo_Domingo',organization:{name:'Estudio local de prueba',slug:'guest-fixture',phone:'+18095550100',description:'Fixture local de reserva invitada',address:'Dirección de prueba',googleMapsUrl:null},services:[{id:'cut',name:'Corte de prueba',description:null,duration:30,price:'500'}],professionals:[{id:'alex',name:'Alex de prueba',bio:null,avatar:null},{id:'other',name:'Otro profesional',bio:null,avatar:null}]};
      else if(url.pathname==='/public/guest-fixture/media') json={hero:null,gallery:[],services:[],professionals:[],promotions:[]};
      else if(url.pathname.endsWith('/availability-days')) json={from:url.searchParams.get('from'),to:url.searchParams.get('to'),serviceId:'cut',availableDates:['2026-10-07'].filter(day=>day>=url.searchParams.get('from')&&day<=url.searchParams.get('to'))};
      else if(url.pathname.endsWith('/availability')) json={date:'2026-10-07',serviceId:'cut',slots:[{time:'18:00',startTime:'2026-10-07T22:00:00Z',professionalId:'alex'}]};
      else if(url.pathname==='/public/guest-fixture/bookings') json={booking:{id:'local-created',status:'PENDING',serviceId:'cut',professionalId:'alex',startTime:'2026-10-07T22:00:00Z',endTime:'2026-10-07T22:30:00Z'}};
      else {unexpected.push(url.pathname);return route.abort();}
      return route.fulfill({status:200,headers,json});
    });
    const params=role?`role=${role}`:'';
    async function measure(stage){const size=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert(size.scrollWidth<=size.width,JSON.stringify({stage,...size}));metrics.push({stage,...size});}
    try {
      await page.goto(`${origin}/?mini=1&${params}`);
      await page.getByRole('link',{name:'Reservar cita',exact:true}).waitFor();
      assert.equal(await page.getByText(/Mis reservas|Crear cuenta|Iniciar sesión/).count(),0);
      assert.equal(await page.locator('a[href*="/cuenta"],a[href*="/mis-reservas"],a[href*="/mi-perfil"]').count(),0);
      await measure('mini');
      await page.goto(`${origin}/?${params}`);
      await page.getByRole('button',{name:/Corte de prueba/}).click();
      await page.getByRole('button',{name:'Elegir profesional'}).click();
      await page.getByRole('button',{name:/Alex de prueba/}).click();
      await page.getByRole('button',{name:'Ver fechas y horas'}).click();
      await page.getByRole('button',{name:'7 de octubre de 2026',exact:true}).click();
      await page.getByRole('button',{name:'6:00 p. m.',exact:true}).click();
      await measure('datetime');
      await page.getByRole('button',{name:'Continuar con tus datos'}).click();
      await expect(page.getByRole('heading',{name:'Tus datos'})).toBeFocused();
      assert.equal(await page.getByText(/Crear cuenta|contraseña|Mis reservas|código de verificación/i).count(),0);
      assert.equal(await page.locator('input[type="password"]').count(),0);
      await page.getByRole('button',{name:'Revisar reserva'}).click();
      await expect(page.getByLabel('Nombre',{exact:true})).toBeFocused();
      await expect(page.getByLabel('Nombre',{exact:true})).toHaveAttribute('aria-invalid','true');
      const fonts=await page.locator('input:not([type="checkbox"])').evaluateAll(nodes=>nodes.map(n=>({id:n.id,px:parseFloat(getComputedStyle(n).fontSize)})));
      assert(fonts.every(f=>f.px>=16),JSON.stringify(fonts));
      const prefix=page.getByRole('button',{name:/País y prefijo/});
      await prefix.focus();await page.keyboard.press('Enter');
      await expect(page.getByLabel('Buscar país o prefijo')).toBeFocused();
      await page.keyboard.press('Escape');await expect(prefix).toBeFocused();
      await page.getByLabel('Nombre',{exact:true}).fill('Visitante de prueba');
      await page.getByLabel('Teléfono',{exact:true}).fill('8095550102');
      await expect(page.getByLabel('Correo (opcional)')).toHaveValue('');
      await measure('contact');
      if(!role) await page.screenshot({path:path.join(out,`contact-${width}.png`),fullPage:true});
      await page.getByRole('button',{name:'Revisar reserva'}).focus();await page.keyboard.press('Enter');
      await expect(page.getByRole('heading',{name:'Revisa tu reserva'})).toBeFocused();await measure('review');
      await page.getByRole('button',{name:'Registrar reserva'}).focus();await page.keyboard.press('Enter');
      await expect(page.getByRole('heading',{name:'Tu reserva quedó registrada'})).toBeFocused();
      await expect(page.getByText('Pendiente de confirmación',{exact:true})).toBeVisible();
      await expect(page.getByRole('button',{name:'Agregar al calendario'})).toBeVisible();
      await expect(page.getByRole('link',{name:/Contactar por WhatsApp/})).toHaveAttribute('href',/^https:\/\/wa\.me\/18095550100\?text=/);
      await expect(page.getByRole('link',{name:'Listo, volver al inicio'})).toBeVisible();
      const posts=requests.filter(r=>r.method==='POST'&&r.path.endsWith('/bookings'));
      assert.equal(posts.length,1);
      for(const key of ['createAccount','password','userId','organizationId']) assert(!(key in posts[0].payload));
      assert.equal(posts[0].payload.clientPhone,'+18095550102');
      await measure('success');
      if(!role) await page.screenshot({path:path.join(out,`success-${width}.png`),fullPage:true});
      assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);
      reports.push({width,role:role||'guest',metrics,fonts,requests,errors,unexpected});
    } catch(error){failures.push({width,role:role||'guest',message:error.stack,errors,unexpected});await page.screenshot({path:path.join(out,`failure-${width}-${role||'guest'}.png`),fullPage:true});}
    await context.close();
  }
} finally {
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
  writeFileSync(path.join(out,'results.json'),JSON.stringify({scope:'C2 local components; controlled transport/Clerk; fallback fonts; no QA/provider/physical evidence',reports,failures},null,2));
}
console.log(JSON.stringify({passed:reports.length,failed:failures.length,evidence:path.relative(root,out)}));
if(failures.length) process.exitCode=1;
