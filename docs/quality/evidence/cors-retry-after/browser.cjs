const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const apiModules = path.join(root,'apps/api/node_modules');
const webModules = path.join(root,'apps/web/node_modules');
const {NestFactory} = require(path.join(apiModules,'@nestjs/core'));
const {Module} = require(path.join(apiModules,'@nestjs/common'));
const ts = require(path.join(apiModules,'typescript'));
const {chromium} = require(path.join(webModules,'@playwright/test'));
const esbuild = require(path.join(root,'node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild'));
const source = fs.readFileSync(path.join(root,'apps/api/src/common/cors.config.ts'),'utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const moduleExports = {};
new Function('exports',compiled)(moduleExports);
const listen = server => new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const close = server => new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
const origin = server => 'http://127.0.0.1:'+server.address().port;
(async()=>{
 let app, browser;
 const servers = [];
 const rows = [];
 try {
  let bundle='';
  const pageHandler=(req,res)=>{res.setHeader('Content-Type',req.url==='/client.js'?'text/javascript':'text/html');res.end(req.url==='/client.js'?bundle:'<!doctype html><script src="/client.js"></script>');};
  const allowed=http.createServer(pageHandler), denied=http.createServer(pageHandler);
  servers.push(allowed,denied); await listen(allowed); await listen(denied);
  class ProbeModule {} Module({})(ProbeModule);
  app=await NestFactory.create(ProbeModule,{logger:false});
  moduleExports.configureCors(app,origin(allowed));
  app.use((req,res)=>{
   const delay=new URL(req.url,'http://localhost').searchParams.get('delay');
   if(delay!==null) res.setHeader('Retry-After',delay);
   res.status(429).json({message:'Demasiados intentos.'});
  });
  await app.listen(0,'127.0.0.1');
  const apiOrigin=await app.getUrl();
  const built=await esbuild.build({stdin:{contents:`import {api,ApiError,configureApiAuth} from './apps/web/lib/api.ts'; window.probe=async(path)=>{configureApiAuth(async()=>({token:null,organizationId:null}));try{await api.patch(path,{});return {unexpected:true};}catch(e){return e instanceof ApiError?{status:e.status,seconds:e.retryAfterSeconds??60}:{networkRejected:true};}};`,resolveDir:root},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NEXT_PUBLIC_API_URL':JSON.stringify(apiOrigin),'process.env.NODE_ENV':'"development"'}});
  bundle=built.outputFiles[0].text;
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage(); await page.goto(origin(allowed));
  for(const [delay,seconds] of [['17',17],['900',300],[null,60],['1.5',60]]){
   const route='/bookings/synthetic/reschedule'+(delay===null?'':'?delay='+encodeURIComponent(delay));
   const result=await page.evaluate(path=>window.probe(path),route);
   assert.deepEqual(result,{status:429,seconds}); rows.push({scenario:'allowed-'+String(delay),passed:true,result});
  }
  const header=await page.evaluate(async url=>{const response=await fetch(url+'/bookings/synthetic/reschedule?delay=17');return response.headers.get('Retry-After');},apiOrigin);
  assert.equal(header,'17'); rows.push({scenario:'browser-can-read-header',passed:true});
  await page.goto(origin(denied));
  const deniedResult=await page.evaluate(()=>window.probe('/bookings/synthetic/reschedule?delay=17'));
  assert.deepEqual(deniedResult,{networkRejected:true});rows.push({scenario:'denied-origin-browser-blocked',passed:true,result:deniedResult});
  fs.writeFileSync(path.join(__dirname,'browser.json'),JSON.stringify({transport:'localhost-only; production CORS function and bundled real web HTTP client; synthetic 429, no database/auth provider',rows},null,2)+'\n');
  console.log(JSON.stringify({scenarios:rows.length,passed:rows.length}));
 } finally { if(browser)await browser.close();if(app)await app.close();for(const server of servers)await close(server); }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
