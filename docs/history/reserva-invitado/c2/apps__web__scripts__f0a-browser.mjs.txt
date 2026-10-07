// QA aislado: componentes, hooks, AuthProvider y cliente HTTP reales; transporte
// controlado sin Clerk remoto, base de datos, .env ni configuración de producto.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(web, '../..');
const require = createRequire(path.join(web, 'package.json'));
const viteRequire = createRequire(createRequire(require.resolve('vitest/package.json')).resolve('vite'));
const { build } = viteRequire('esbuild');
const postcss = createRequire(require.resolve('@tailwindcss/postcss'))('postcss');
const tailwind = require('@tailwindcss/postcss');
const { chromium } = require('@playwright/test');
const out = path.join(root, '.tmp/f0a');
mkdirSync(out, { recursive: true });
const id = '12345678-1234-4234-8234-123456789abc';
const baseline = process.argv.includes('--baseline');
const css = await postcss([tailwind({ base: web })]).process(readFileSync(path.join(web, 'app/globals.css'), 'utf8'), { from: path.join(web, 'app/globals.css') });
const entry = `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth-context';
import DashboardLayout from '@/app/dashboard/layout';
import BookingsPage from '@/app/dashboard/bookings/page';
import InvoicesPage from '@/app/dashboard/invoices/page';
import ProfessionalsPage from '@/app/dashboard/professionals/page';
import { AccountStep } from '@/app/[slug]/_components/AccountStep';
import { SuccessView } from '@/app/[slug]/_components/SuccessView';
import { InputField, SelectField } from '@/components/ui/Field';
import { PasswordField } from '@/components/ui/PasswordField';
import { ToastProvider } from '@/components/ui/Toast';
const params = new URLSearchParams(location.search);
function App() {
 const [password, setPassword] = useState('1234567');
 const view = params.get('view');
 if (view === 'fields') return <main className="mx-auto max-w-xl space-y-4 p-4">
   <InputField label="Entrada oscura" defaultValue="Texto" />
   <InputField tone="light" label="Entrada clara" defaultValue="Texto" />
   <SelectField label="Selección"><option>Profesional</option></SelectField>
   <InputField label="Entrada con clase propia" className="w-full text-xs" defaultValue="Texto" />
   <PasswordField label="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} />
 </main>;
 if (view === 'account') return <main className="mx-auto max-w-xl p-4"><AccountStep clientEmail="sintetico@example.test" createAccount password={password} onToggle={()=>{}} onPasswordChange={setPassword} onBack={()=>{}} onNext={()=>{document.body.dataset.advanced='true'}} /></main>;
 if (view === 'success') return <main className="mx-auto max-w-xl p-4"><SuccessView result={{booking:{status:'PENDING'},accountCreated:false}} organizationPhone={null} serviceName="Servicio sintético" professionalName="Profesional sintético" date="2099-01-05" time="23:00" /></main>;
 return <AuthProvider><DashboardLayout>{view === 'invoices' ? <InvoicesPage/> : view === 'profile' ? <ProfessionalsPage/> : <BookingsPage/>}</DashboardLayout></AuthProvider>;
}
const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><ToastProvider><App/></ToastProvider></QueryClientProvider>);
`;
const artifacts = await build({
  stdin: { contents: entry, loader: 'tsx', resolveDir: web }, bundle: true,
  write: false, format: 'iife', jsx: 'automatic',
  // Fixture de compilación, sin leer ni modificar variables del proceso/producto.
  define: { 'process.env': '{}' },
  plugins: [{ name: 'f0a-isolation', setup(b) {
    b.onResolve({ filter: /^@clerk\/nextjs$|^next\/navigation$|^next\/link$/ }, (args) => ({ path: args.path, namespace: 'qa' }));
    b.onLoad({ filter: /.*/, namespace: 'qa' }, (args) => ({ loader: 'tsx', resolveDir: web, contents:
      args.path === '@clerk/nextjs' ? "const getToken=async()=> 'synthetic-session-only'; export const useAuth=()=>({getToken,isLoaded:true,isSignedIn:true,signOut:async()=>{},userId:'synthetic-user'});" :
      args.path === 'next/navigation' ? "export const usePathname=()=> '/dashboard/'+(new URLSearchParams(location.search).get('view')==='profile'?'professionals':new URLSearchParams(location.search).get('view')||'bookings'); export const useRouter=()=>({push:()=>{},replace:()=>{}});" :
      "export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}" }));
    b.onResolve({ filter: /^@\// }, (args) => {
      const base = path.join(web, args.path.slice(2));
      for (const ext of ['', '.ts', '.tsx', '.js']) { try { readFileSync(base+ext); return { path: base+ext }; } catch { /* siguiente extensión */ } }
    });
    if (baseline) b.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, (args) => {
      if (!args.path.startsWith(web) || args.path.includes('node_modules')) return;
      const rel = path.relative(root, args.path).split(path.sep).join('/');
      try { return { contents: execFileSync('git', ['show', 'HEAD:'+rel], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }), loader: args.path.endsWith('tsx') ? 'tsx' : 'ts' }; }
      catch { return; }
    });
  } }],
});
const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><title>QA F0-A aislado</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
const server = createServer((req, res) => {
  res.setHeader('Content-Type', req.url === '/app.js' ? 'application/javascript' : req.url === '/style.css' ? 'text/css' : 'text/html');
  res.end(req.url === '/app.js' ? artifacts.outputFiles[0].contents : req.url === '/style.css' ? css.css : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const reports = [];
try {
 for (const width of [320, 375, 390, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'Asia/Tokyo' });
  const page = await context.newPage();
  // Portapapeles controlado: no sustituye ni lee el portapapeles del propietario.
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async value => { window.__f0aCopiedCode = value; } },
  }));
  const consoleErrors = [], unexpectedRequests = [];
  let current = new URLSearchParams();
  page.on('pageerror', error => consoleErrors.push(error.message));
  page.on('console', msg => { if (msg.type()==='error' && !msg.text().includes('Failed to load resource')) consoleErrors.push(msg.text()); });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.origin !== 'http://localhost:3000') { unexpectedRequests.push(url.origin); return route.abort(); }
    const headers = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization,content-type,x-organization-id', 'access-control-allow-methods': 'GET,PATCH,POST,OPTIONS', 'access-control-expose-headers': 'X-Request-Id,X-Total-Count,X-Page,X-Limit,X-Total-Pages', 'X-Request-Id': id, 'X-Total-Count': '1', 'X-Page': '1', 'X-Limit': '20', 'X-Total-Pages': '1' };
    if (route.request().method()==='OPTIONS') return route.fulfill({ status:204, headers });
    const role = current.get('role') || 'OWNER', failure = current.get('failure');
    const professional = { id:'qa-professional', name:'Profesional sintético', specialty:null, bio:null, avatar:null, phone:null, experienceYears:null, status:'ACTIVE', isPublic:false, linkedUser:null };
    let status=200, json=[];
    if (url.pathname === '/auth/clerk/bootstrap') {
      json={state:'READY', user:{id:'qa-user',name:'Cuenta sintética'}, preferredOrganizationId:'qa-org',memberships:[{role,organization:{id:'qa-org',name:'Negocio sintético',slug:'qa-f0a'}}]};
      if (failure==='session') { status=401; json={message:'Sesión no válida'}; }
    } else if (url.pathname === '/organizations/mine') json={id:'qa-org',timeZone:'America/Santo_Domingo'};
    else if (url.pathname === '/bookings') json=[{id:'qa-booking',status:current.get('status')||'CONFIRMED',startTime:'2099-01-05T14:00:00Z',endTime:'2099-01-05T14:30:00Z',service:{name:'Servicio sintético',duration:30},professional:{name:professional.name},client:{name:'Cliente sintético'}}];
    else if (url.pathname === '/bookings/qa-booking/status') {
      status=failure==='unexpected'?503:failure==='permission'?403:failure==='conflict'?409:400;
      json={message:status===403?'Forbidden':status===409?'El profesional ya tiene una cita reservada en este horario':'Transición administrativa de estado no permitida'};
    } else if (url.pathname === '/professionals/me') {
      json=professional;
      if (failure==='load') { status=503; json={message:'Detalle técnico de prueba'}; }
      if (route.request().method()==='PATCH') { status=failure==='save-unknown'?503:400; json={message:status===503?'Detalle técnico de prueba':'Revisa el nombre del perfil.'}; }
    } else if (url.pathname === '/professionals') json=[professional];
    else if (url.pathname === '/media') json=[];
    else if (url.pathname === '/invoices') { json=[]; headers['X-Total-Count']='0'; headers['X-Total-Pages']='0'; }
    else { unexpectedRequests.push(url.pathname); return route.abort(); }
    await route.fulfill({ status, headers, json });
  });
  async function visit(query) { current=new URLSearchParams(query); await page.goto(origin+'/?'+current); }
  async function capture(name) { await page.screenshot({ path:path.join(out,`${baseline?'antes':'despues'}-${name}-${width}.png`), fullPage:true }); }
  async function record(name, check) { try { await check(); reports.push({width,name,passed:true}); } catch(error) { reports.push({width,name,passed:false,message:error.message.split('\n')[0]}); } }
  async function noOverflow() { assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)); }
  async function supportCode() {
    const code=page.getByText('Código de soporte: '+id,{exact:true}).first();
    await code.waitFor();
    const style=await code.evaluate(node=>{
      const css=getComputedStyle(node);
      let background=node.parentElement;
      while (background && getComputedStyle(background).backgroundColor==='rgba(0, 0, 0, 0)') background=background.parentElement;
      const canvas=document.createElement('canvas'); canvas.width=canvas.height=1;
      const context=canvas.getContext('2d');
      function luminance(color) {
        context.clearRect(0,0,1,1); context.fillStyle=color; context.fillRect(0,0,1,1);
        const channels=Array.from(context.getImageData(0,0,1,1).data).slice(0,3).map(value=>value/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
        return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
      }
      const foreground=luminance(css.color), back=luminance(getComputedStyle(background||document.body).backgroundColor);
      return {whiteSpace:css.whiteSpace,textOverflow:css.textOverflow,height:node.getBoundingClientRect().height,lineHeight:parseFloat(css.lineHeight),contrast:(Math.max(foreground,back)+0.05)/(Math.min(foreground,back)+0.05)};
    });
    assert.equal(style.whiteSpace,'nowrap'); assert.equal(style.textOverflow,'ellipsis'); assert(style.height<=style.lineHeight+1); assert(style.contrast>=4.5,JSON.stringify(style));
    const copy=page.getByRole('button',{name:'Copiar código de soporte'}).first();
    await copy.focus(); assert(await copy.evaluate(node=>node===document.activeElement)); await copy.press('Enter');
    await page.getByRole('status').filter({hasText:'Copiado'}).first().waitFor();
    assert.equal(await page.evaluate(()=>window.__f0aCopiedCode),id);
    await noOverflow();
  }
  await visit({view:'fields'});
  await page.getByLabel('Entrada oscura').waitFor();
  await record('campos compartidos >=16 px en móvil', async()=> {
    const sizes=await page.locator('input,select').evaluateAll(nodes=>nodes.map(n=>parseFloat(getComputedStyle(n).fontSize)));
    if (width<640) assert(sizes.every(n=>n>=16),JSON.stringify(sizes));
    await noOverflow();
  });
  await capture('campos');
  await visit({view:'account'});
  await capture('cuenta-invalida');
  await record('contraseña siete bloqueada, ocho permite continuar y ayuda asociada', async()=> {
    const next=page.getByRole('button',{name:'Continuar'}); assert(await next.isDisabled());
    assert.match(await page.getByLabel('Crea una contraseña').getAttribute('aria-describedby')||'',/error/);
    await noOverflow();
    await page.getByLabel('Crea una contraseña').fill('12345678'); assert(await next.isEnabled());
    await noOverflow();
  });
  await capture('cuenta');
  await visit({view:'success'});
  await record('éxito natural con hora del negocio frente a dispositivo Tokio', async()=> {
    assert.match(await page.locator('main').innerText(),/5 de enero de 2099 a las 11:00 p\. m\./);
    await noOverflow();
  });
  await capture('exito');
  for (const view of ['bookings','invoices']) {
    await visit({view}); await page.getByLabel('Desde').waitFor();
    await record(view+' filtros accesibles y tipografía móvil', async()=> {
      for (const label of ['Desde','Hasta']) {
        const field=page.getByLabel(label);
        const desc=await field.getAttribute('aria-describedby'); assert(desc);
        assert.match(await page.locator('[id="'+desc+'"]').innerText(),/Ejemplo:/);
        if (width<640) assert(await field.evaluate(n=>parseFloat(getComputedStyle(n).fontSize))>=16);
        await field.focus(); assert(await field.evaluate(n=>n===document.activeElement));
      }
      await noOverflow();
    });
    await capture(view);
  }
  for (const failure of ['transition','conflict','permission']) {
    await visit({view:'bookings',failure}); await page.getByRole('button',{name:'Completar'}).first().waitFor();
    await page.getByRole('button',{name:'Completar'}).first().click();
    await record('error esperado de estado '+failure+' sin código', async()=> {
      const alert=page.getByRole('alert').first(); await alert.waitFor({timeout:3000});
      assert(!/Código de soporte/.test(await alert.innerText())); assert.equal(await alert.getByRole('button',{name:'Copiar código de soporte'}).count(),0);
      assert.match(await alert.innerText(),failure==='transition'?/cambio de estado no está permitido/:failure==='conflict'?/ya tiene una cita/:/No tienes permiso/);
      if (!baseline) assert(await alert.evaluate(n=>n===document.activeElement));
      await noOverflow();
    });
    await capture('estado-'+failure);
  }
  await visit({view:'bookings',failure:'unexpected'}); await page.getByRole('button',{name:'Completar'}).first().click();
  await record('estado 5xx: soporte en una línea, contraste y copia por teclado',supportCode);
  await capture('estado-inesperado');
  await visit({view:'bookings',role:'BARBER',status:'PENDING'});
  await page.getByRole('button',{name:'Confirmar',exact:true}).first().waitFor();
  await record('Profesional pendiente no ofrece Completar ni Cancelar',async()=>{
    assert.equal(await page.getByRole('button',{name:'Completar',exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'Cancelar',exact:true}).count(),0);
    if(width>=768) assert.match(await page.locator('aside').innerText(),/Profesional/);
  });
  await visit({view:'bookings',failure:'session'});
  await page.getByRole('heading',{name:'No pudimos abrir tu panel'}).waitFor();
  await record('error de sesión conserva texto y añade soporte copiable',supportCode);
  await capture('sesion');
  await visit({view:'profile',role:'BARBER',failure:'load'});
  await page.getByText('Tu cuenta no tiene un perfil profesional disponible').first().waitFor();
  await record('carga de perfil añade soporte copiable sin detalle técnico',async()=>{ await supportCode(); assert(!(await page.locator('main').innerText()).includes('Detalle técnico')); });
  await capture('perfil-carga');
  await visit({view:'profile',role:'BARBER',failure:'save'});
  await page.getByRole('button',{name:'Gestionar mi perfil'}).waitFor(); await page.getByRole('button',{name:'Gestionar mi perfil'}).click();
  await page.getByRole('button',{name:'Editar información'}).click();
  await page.getByRole('button',{name:/Guardar/}).click();
  await record('guardado perfil esperado conserva borrador sin código',async()=>{ const alert=page.getByRole('alert').first(); await alert.waitFor(); assert(!/Código de soporte/.test(await alert.innerText())); assert.equal(await page.getByLabel('Nombre').inputValue(),'Profesional sintético'); await noOverflow(); });
  await capture('perfil-guardado');
  await visit({view:'profile',role:'BARBER',failure:'save-unknown'});
  await page.getByRole('button',{name:'Gestionar mi perfil'}).click(); await page.getByRole('button',{name:'Editar información'}).click(); await page.getByRole('button',{name:/Guardar/}).click();
  await record('guardado perfil inesperado conserva borrador y soporte copiable',async()=>{ await supportCode(); assert.equal(await page.getByLabel('Nombre').inputValue(),'Profesional sintético'); });
  await capture('perfil-guardado-inesperado');
  reports.push({width,name:'consola JavaScript y aislamiento de red',passed:consoleErrors.length===0&&unexpectedRequests.length===0,consoleErrors,unexpectedRequests});
  await context.close();
 }
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
writeFileSync(path.join(out,baseline?'antes.json':'despues.json'),JSON.stringify({browser:'Chrome',baseline,reports},null,2));
console.log(JSON.stringify({baseline,passed:reports.filter(r=>r.passed).length,failed:reports.filter(r=>!r.passed)},null,2));
if (reports.some(r=>!r.passed)) process.exitCode=1;
