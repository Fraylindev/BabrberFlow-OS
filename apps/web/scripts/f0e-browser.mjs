// QA de componentes y transporte controlado. Cero bases/proveedores/sesiones reales.
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
const out = path.join(root, 'docs/quality/evidence/f0e');
mkdirSync(out, { recursive: true });
const styles = await postcss([tailwind({ base: web })]).process(readFileSync(path.join(web, 'app/globals.css'), 'utf8'), { from: path.join(web, 'app/globals.css') });
const entry = `
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth-context';
import DashboardLayout from '@/app/dashboard/layout';
import BookingsPage from '@/app/dashboard/bookings/page';
import InvoicesPage from '@/app/dashboard/invoices/page';
import { PublicBookingFlow } from '@/components/public/PublicBookingScreen';
import { ToastProvider } from '@/components/ui/Toast';
const view = new URLSearchParams(location.search).get('view');
const client = new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><ToastProvider><AuthProvider>{view==='public'
  ? <PublicBookingFlow slug="f0e-synthetic" />
  : <DashboardLayout>{view==='invoices'?<InvoicesPage/>:<BookingsPage/>}</DashboardLayout>}
</AuthProvider></ToastProvider></QueryClientProvider>);
`;
const bundle = await build({
  stdin: { contents: entry, loader: 'tsx', resolveDir: web }, bundle: true, write: false, outfile: path.join(out, 'app.js'), format: 'iife', jsx: 'automatic',
  define: { 'process.env': '{}' },
  plugins: [{ name: 'f0e-isolation', setup(b) {
    b.onResolve({ filter: /^@clerk\/nextjs$|^next\/navigation$|^next\/link$/ }, args => ({ path: args.path, namespace: 'qa' }));
    b.onLoad({ filter: /.*/, namespace: 'qa' }, args => ({ loader: 'tsx', resolveDir: web, contents:
      args.path === '@clerk/nextjs' ? "const getToken=async()=> 'synthetic-session'; export const useAuth=()=>({getToken,isLoaded:true,isSignedIn:true,signOut:async()=>{},userId:'synthetic-user'});" :
      args.path === 'next/navigation' ? "export const usePathname=()=>new URLSearchParams(location.search).get('view')==='invoices'?'/dashboard/invoices':'/dashboard/bookings'; export const useRouter=()=>({push:p=>{document.body.dataset.destination=p},replace:p=>{document.body.dataset.destination=p}});" :
      "export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}" }));
    b.onResolve({ filter: /^@\// }, args => {
      const base = path.join(web, args.path.slice(2));
      for (const ext of ['', '.ts', '.tsx', '.js']) { try { readFileSync(base+ext); return { path: base+ext }; } catch { /* siguiente extensión */ } }
    });
  } }],
});
const app = bundle.outputFiles.find(file => !file.path.endsWith('.css'));
const css = styles.css + '\n' + readFileSync(path.join(web, 'components/public/booking.css'), 'utf8');
const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="/style.css"><title>QA F0-E sintético</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
const server = createServer((req, res) => {
  res.setHeader('Content-Type', req.url === '/app.js' ? 'application/javascript' : req.url === '/style.css' ? 'text/css' : 'text/html');
  res.end(req.url === '/app.js' ? app.contents : req.url === '/style.css' ? css : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const reports = [], failures = [];
const start = '2026-10-05T14:00:00Z';
const clientName = 'Cliente sintético con nombre y apellidos especialmente largos';
const professionalName = 'Profesional sintético con un nombre especialmente extenso';
const serviceName = 'Servicio sintético de dos horas con un nombre especialmente extenso';
const rows = [
  ['pending','PENDING',null], ['confirmed','CONFIRMED',null], ['completed','COMPLETED',null],
  ['issued','COMPLETED',{id:'invoice-issued',state:'ISSUED'}], ['paid','COMPLETED',{id:'invoice-paid',state:'PAID'}],
  ['cancelled','CANCELLED',null], ['absent','NO_SHOW',null],
].map(([id,status,invoice]) => ({ id, status, invoice, startTime:start, endTime:'2026-10-05T16:00:00Z',
  serviceId:'cut',professionalId:'alex',clientId:'client',client:{name:clientName},professional:{name:professionalName},service:{name:serviceName,duration:120} }));
const photo = id => ({id,url:`/public/f0e-synthetic/media/${id}`,altText:'Imagen sintética de QA',decorative:false,caption:null});
function contrast(a, b) {
  const lum = color => { const channels = color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => v/255).map(v => v<=.04045?v/12.92:((v+.055)/1.055)**2.4); return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722; };
  const x = lum(a), y = lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
try {
  for (const width of (process.argv.includes('--diagnose') ? [1024,375] : [320,375,390,768,1024,1280,1440,1920])) {
    const context = await browser.newContext({viewport:{width,height:900},timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    let params = new URLSearchParams(), requests = [], errors = [], expectedResourceErrors = [], unexpected = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type()==='error') {
      if (/Failed to load resource.*status of (403|409)/.test(message.text())) expectedResourceErrors.push(message.text());
      else errors.push(message.text());
    } });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname==='flagcdn.com') return route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="28"><rect width="40" height="28" fill="#eee"/></svg>'});
      if (url.origin === origin) {
        if (url.pathname.startsWith('/media-proxy/')) return route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#356b61"/><circle cx="200" cy="150" r="80" fill="#fafafa"/><path d="M70 400Q70 230 200 230Q330 230 330 400" fill="#fafafa"/></svg>'});
        return route.continue();
      }
      if (url.origin !== 'http://localhost:3000') { unexpected.push(url.href); return route.abort(); }
      const headers = {'content-type':'application/json','access-control-allow-origin':origin,'access-control-allow-headers':'authorization,content-type,x-organization-id','access-control-allow-methods':'GET,PATCH,POST,OPTIONS',
        'access-control-expose-headers':'X-Total-Count,X-Page,X-Limit,X-Total-Pages','X-Total-Count':'2','X-Page':'1','X-Limit':'20','X-Total-Pages':'1'};
      if (route.request().method()==='OPTIONS') return route.fulfill({status:204,headers});
      requests.push({path:url.pathname,search:url.search,method:route.request().method()});
      let json, status=200;
      const role = params.get('role') || 'OWNER';
      if (url.pathname==='/auth/clerk/bootstrap') json={state:'READY',user:{id:'qa-user',name:'Cuenta sintética'},preferredOrganizationId:'qa-org',memberships:[{role,organization:{id:'qa-org',name:'Negocio sintético',slug:'f0e-synthetic'}}]};
      else if (url.pathname==='/organizations/mine') json={id:'qa-org',timeZone:'America/Santo_Domingo'};
      else if (url.pathname==='/bookings') {
        if (params.get('failure')==='load') {status=403;json={message:'Acceso no permitido'};}
        else json=params.get('empty') ? [] : rows.filter(row=>!url.searchParams.get('status')||row.status===url.searchParams.get('status'));
      }
      else if (/^\/bookings\/[^/]+\/status$/.test(url.pathname)) {
        if(params.get('failure')==='mutation') {status=409;json={message:'Transición administrativa de estado no permitida'};}
        else json={...rows.find(row=>url.pathname.includes(row.id)),status:JSON.parse(route.request().postData()).status};
      }
      else if(url.pathname==='/invoices') json=['ISSUED','PAID'].map((state,i)=>({id:'invoice-'+i,state,amount:'500.00',currency:'DOP',issuedAt:start,booking:{id:'booking-'+i,startTime:start,clientName,serviceName,professionalName},payment:state==='PAID'?{method:'CASH',paidAt:start}:null}));
      else if(url.pathname==='/public/f0e-synthetic/booking-data') json={minimumBookingDate:'2026-10-02',timeZone:'America/Santo_Domingo',organization:{name:'Negocio sintético',slug:'f0e-synthetic',phone:params.get('phone')==='none'?null:'+18095550100',description:null,address:'Dirección sintética de QA, Santo Domingo',googleMapsUrl:'https://maps.google.com/?q=Santo+Domingo'},services:[{id:'cut',name:serviceName,description:null,duration:120,price:'500'}],professionals:[{id:'alex',name:professionalName,bio:null,avatar:null}]};
      else if(url.pathname==='/public/f0e-synthetic/media') json={hero:null,gallery:[],services:params.get('photos')==='none'?[]:[{serviceId:'cut',image:photo('service')}],professionals:params.get('photos')==='none'?[]:[{professionalId:'alex',avatar:photo('professional')}],promotions:[]};
      else if(url.pathname.endsWith('/availability-days')) json={from:url.searchParams.get('from'),to:url.searchParams.get('to'),serviceId:'cut',availableDates:['2026-10-05'].filter(day=>day>=url.searchParams.get('from')&&day<=url.searchParams.get('to'))};
      else if(url.pathname.endsWith('/availability')) json={date:'2026-10-05',serviceId:'cut',slots:[{time:'10:00',startTime:start,professionalId:'alex'}]};
      else if(url.pathname==='/public/f0e-synthetic/bookings') json={booking:{id:'synthetic-created',status:'PENDING',serviceId:'cut',professionalId:'alex',startTime:start,endTime:'2026-10-05T16:00:00Z'},accountCreated:false,accountCreationError:null};
      else {unexpected.push(url.pathname);return route.abort();}
      return route.fulfill({status,headers,json});
    });
    async function visit(query) { params=new URLSearchParams(query);requests=[];await page.goto(origin+'/?'+params); }
    async function measure(name, more={}) {
      const data=await page.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth}));
      assert(data.scrollWidth<=data.innerWidth,JSON.stringify(data));
      reports.push({width,name,...data,...more});
    }
    async function capture(name) {await page.screenshot({path:path.join(out,`${name}-${width}.png`),fullPage:true});}
    try {
      await visit({view:'bookings'});
      await page.getByRole('button',{name:'Completar',exact:true}).filter({visible:true}).waitFor();
      assert.equal(await page.getByLabel('Desde').inputValue(),'');assert.equal(await page.getByLabel('Hasta').inputValue(),'');
      assert.equal(await page.getByLabel('Estado',{exact:true}).inputValue(),'TO_ATTEND');
      assert(requests.filter(r=>r.path==='/bookings').every(r=>!r.search));
      assert.equal(await page.getByText('2 reservas',{exact:true}).count(),1);
      await measure('reservas-inicial');await capture('reservas-inicial');
      await page.getByLabel('Estado',{exact:true}).selectOption('ALL');
      await page.getByText('7 reservas',{exact:true}).waitFor();
      if(width>=1024) {
        const bounds=await page.locator('tbody tr').evaluateAll(rows=>rows.map(row=>{
          const cell=row.lastElementChild,box=cell.getBoundingClientRect();
          return {text:cell.textContent.trim(),buttons:[...cell.querySelectorAll('button')].map(button=>({text:button.textContent.trim(),right:button.getBoundingClientRect().right,cellRight:box.right})),scrollWidth:cell.scrollWidth,clientWidth:cell.clientWidth};
        }));
        for(const row of bounds){assert(row.buttons.length<=2);assert(row.scrollWidth<=row.clientWidth);for(const button of row.buttons)assert(button.right<=button.cellRight);assert(!/Factura pagada|Pendiente de cobro|Avisos por correo|Ver facturación/.test(row.text));}
        const nameAnchor=page.locator('tbody tr').first().locator('[tabindex="0"]').first();
        await nameAnchor.hover();await page.getByRole('tooltip').waitFor();
        await nameAnchor.focus();
        await page.getByRole('tooltip').waitFor();assert.equal(await page.getByRole('tooltip').textContent(),clientName);
        await page.keyboard.press('Escape');assert.equal(await page.getByRole('tooltip').count(),0);
        const paid=page.locator('tbody tr').filter({has:page.getByText('Factura pagada',{exact:true})});
        const more=paid.getByRole('button',{name:'Más acciones de la reserva'});
        await more.focus();await page.keyboard.press('Enter');
        await expect(page.getByRole('menuitem',{name:'Ver facturación'})).toBeFocused();
        await page.keyboard.press('End');await expect(page.getByRole('menuitem',{name:'Avisos por correo'})).toBeFocused();
        await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');
        await expect(more).toBeFocused();
        await more.click();await page.getByRole('menuitem',{name:'Ver facturación'}).click();assert.equal(await page.locator('body').getAttribute('data-destination'),'/dashboard/invoices');
        await more.click();await page.getByRole('menuitem',{name:'Avisos por correo'}).click();assert.equal(await page.locator('body').getAttribute('data-destination'),'/dashboard/bookings/paid/notifications');
        await measure('reservas-todas-acciones',{bounds});
      } else {assert.equal(await page.locator('article').count(),7);await measure('reservas-tarjetas');}
      await capture('reservas-todas');
      await page.getByLabel('Desde').fill('2026-10-05');await page.getByText('7 reservas en el rango seleccionado',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Limpiar filtros'}).click();await page.getByText('2 reservas',{exact:true}).waitFor();
      assert.equal(await page.getByLabel('Desde').inputValue(),'');assert.equal(await page.getByLabel('Hasta').inputValue(),'');assert.equal(await page.getByLabel('Estado',{exact:true}).inputValue(),'TO_ATTEND');
      for(const status of ['PENDING','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW']){await page.getByLabel('Estado',{exact:true}).selectOption(status);await page.getByText(`${status==='COMPLETED'?3:1} reserva${status==='COMPLETED'?'s':''}`,{exact:true}).waitFor();}
      await visit({view:'bookings',empty:'yes'});await page.getByText('No hay reservas por atender',{exact:true}).waitFor();await measure('reservas-vacio');
      await visit({view:'bookings',failure:'load'});await page.getByText('No pudimos consultar estas reservas con tu acceso actual.').waitFor();await measure('reservas-error');
      await visit({view:'bookings',failure:'mutation'});await page.getByRole('button',{name:'Completar',exact:true}).filter({visible:true}).click();await page.getByRole('alert').waitFor();await measure('reserva-error-transicion');
      for(const role of ['ADMIN','RECEPTIONIST','BARBER']) {
        await visit({view:'bookings',role});
        const visible=page.getByRole('button',{name:'Más acciones de la reserva'}).filter({visible:true}).first();await visible.waitFor();await visible.click();await page.getByRole('menu').waitFor();
        assert.equal(await page.getByRole('menuitem',{name:'Avisos por correo'}).count(),role==='BARBER'?0:1);
        assert.equal(await page.getByRole('menuitem',{name:'Reprogramar'}).count(),role==='BARBER'?0:1);
        assert.equal(await page.getByRole('menuitem',{name:'Cancelar'}).count(),role==='BARBER'?0:1);
        await page.keyboard.press('Escape');await measure('reservas-rol-'+role);
      }
      await visit({view:'invoices'});await page.getByRole('heading',{name:/Facturación/}).waitFor();await page.getByText(serviceName,{exact:true}).filter({visible:true}).first().waitFor();
      const invoice=await page.locator('table').evaluate(table=>({visible:!!table.getBoundingClientRect().width,tableWidth:table.getBoundingClientRect().width,containerWidth:table.parentElement.clientWidth,scrollWidth:table.parentElement.scrollWidth}));
      await measure('facturacion-diagnostico',{invoice});await capture('facturacion');
      if(width<=390) for(const phone of ['business','none']) {
        await visit({view:'public',phone,photos:phone==='none'?'none':'yes'});
        await page.getByRole('button',{name:new RegExp(serviceName)}).click();await page.getByRole('button',{name:'Elegir profesional'}).click();
        await page.getByRole('button',{name:'5 de octubre de 2026',exact:true}).click();await page.getByRole('button',{name:'10:00 a. m.',exact:true}).click();await page.getByRole('button',{name:'Continuar con tus datos'}).click();
        await page.getByLabel('Nombre',{exact:true}).fill('Visitante sintético');await page.getByLabel('Teléfono',{exact:true}).fill('8095550102');await page.getByRole('button',{name:'Revisar reserva'}).click();
        await page.getByRole('heading',{name:'Revisa tu reserva'}).waitFor();
        const photos=await page.locator('.booking-summary-row>div:first-child').evaluateAll(nodes=>nodes.map(node=>({width:node.clientWidth,height:node.clientHeight,radius:getComputedStyle(node).borderRadius})));
        assert.equal(photos.length,2);assert.deepEqual(photos[0],photos[1]);
        assert.equal(await page.getByText('2 h · RD$ 500',{exact:true}).count(),1);
        await measure('revision-'+phone,{photos});await capture('revision-'+phone);
        await page.getByRole('button',{name:'Registrar reserva'}).click();await page.getByRole('heading',{name:'Tu reserva quedó registrada'}).waitFor();
        const successPhotos=await page.locator('.booking-summary-row>div:first-child').evaluateAll(nodes=>nodes.map(node=>({width:node.clientWidth,height:node.clientHeight,radius:getComputedStyle(node).borderRadius})));
        assert.equal(successPhotos.length,2);assert.deepEqual(successPhotos[0],successPhotos[1]);
        assert.equal(await page.getByText('2 h · RD$ 500',{exact:true}).count(),1);
        assert.equal(await page.getByRole('status').textContent(),'Pendiente de confirmación');
        const whatsapp=page.getByRole('link',{name:'Contactar por WhatsApp (se abre en una pestaña nueva)'});
        assert.equal(await whatsapp.count(),phone==='business'?1:0);
        if(phone==='business') {
          const href=new URL(await whatsapp.getAttribute('href'));assert.equal(href.pathname,'/18095550100');assert.equal(href.searchParams.get('text'),'Hola. Acabo de registrar una reserva en su página y quisiera consultar con ustedes.');
          assert.equal(await whatsapp.getAttribute('target'),'_blank');assert.equal(await whatsapp.getAttribute('rel'),'noopener noreferrer');
          const style=await whatsapp.evaluate(node=>({color:getComputedStyle(node).color,border:getComputedStyle(node).borderColor,background:getComputedStyle(document.body).backgroundColor,height:node.getBoundingClientRect().height,targetWidth:node.getBoundingClientRect().width}));
          assert(style.height>=44);assert(contrast(style.color,style.background)>=4.5);assert(contrast(style.border,style.background)>=3);
          reports.push({width,name:'whatsapp-contraste',...style,contrast:contrast(style.color,style.background)});
        }
        assert.equal(await page.getByText(/Abrirás WhatsApp|809-555-0100/).count(),0);
        const order=await page.locator('.calendar-action,.booking-secondary-action,.booking-return-link').allTextContents();
        assert.deepEqual(order.map(text=>text.trim()),phone==='business'?['Agregar al calendario','Contactar por WhatsApp','Cómo llegar','Listo']:['Agregar al calendario','Cómo llegar','Listo']);
        assert.equal(await page.getByRole('link',{name:'Listo'}).getAttribute('href'),'/f0e-synthetic');
        await page.getByRole('button',{name:'Agregar al calendario'}).focus();await page.keyboard.press('Tab');
        assert.equal(await page.getByRole('link',{name:phone==='business'?'Contactar por WhatsApp (se abre en una pestaña nueva)':'Cómo llegar (se abre en una pestaña nueva)'}).evaluate(node=>node===document.activeElement),true);
        const padding=await page.locator('.booking-flow').evaluate(node=>getComputedStyle(node).paddingBottom);assert(parseFloat(padding)>=96);
        await measure('exito-'+phone,{photos:successPhotos,paddingBottom:padding,order});await capture('exito-'+phone);
        assert.equal(requests.filter(r=>r.path.endsWith('/bookings')&&r.method==='POST').length,1);
      }
      assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(unexpected.length,0,JSON.stringify(unexpected));
      reports.push({width,name:'consola-transporte',errors,expectedResourceErrors,unexpected});
    } catch(error) {failures.push({width,message:error.stack,errors,unexpected});await capture('fallo');}
    await context.close();
  }
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
writeFileSync(path.join(out,'browser.json'),JSON.stringify({environment:'Chrome local headless, componentes reales, transporte HTTP controlado, sin DB/Clerk/proveedores reales, reloj de negocio Santo Domingo y dispositivo Tokio',reports,failures},null,2));
console.log(JSON.stringify({reports:reports.length,failures}));
if(failures.length)process.exitCode=1;
