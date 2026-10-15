const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const keys = ['PATH','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PNPM_HOME','NUMBER_OF_PROCESSORS','PROCESSOR_ARCHITECTURE','OS','HOMEDRIVE','HOMEPATH'];
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => keys.some(name => name.toLowerCase() === key.toLowerCase())));
Object.assign(env, {
  NEXT_TELEMETRY_DISABLED:'1', DEPLOY_ENV:'development',
  NEXT_PUBLIC_API_URL:'http://127.0.0.1:31999',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:['pk','test',Buffer.from('synthetic-cors.clerk.accounts.dev$').toString('base64')].join('_'),
  CLERK_SECRET_KEY:['sk','test',crypto.randomBytes(24).toString('hex')].join('_'),
  RATE_LIMIT_SECRET:crypto.randomBytes(32).toString('hex'),
  JWT_SECRET:crypto.randomBytes(32).toString('hex'),
  DATABASE_URL:'postgresql://synthetic@127.0.0.1:1/cors_no_database',
  NOTIFICATIONS_EMAIL_ENABLED:'false', REQUIRE_INTERNAL_MFA:'false',
  NODE_OPTIONS:'--require="'+path.join(root,'apps/api/test/guest-postgres-no-dotenv.cjs').replaceAll('\\','/')+'"',
});
const commands = [
 ['api-targeted','api','test',['--runInBand','common/cors.config.spec.ts','bookings/calendar-budget.guard.spec.ts']],
 ['web-targeted','web','exec',['vitest','run','components/calendar/CalendarFailure.test.tsx']],
 ['api-type-check','api','type-check',[]], ['api-lint','api','lint',[]],
 ['api-test','api','test',['--runInBand']], ['api-build','api','build',[]],
 ['web-type-check','web','type-check:clean',[]], ['web-lint','web','lint',[]],
 ['web-test','web','test',[]], ['web-build','web','build',['--webpack']],
];
const selected = process.argv[2];
const results = [];
for (const [label,target,script,args] of commands) {
 if (selected && selected !== label && !((selected === 'api' || selected === 'web') && label.startsWith(selected + '-'))) continue;
 const argv = ['--config.verify-deps-before-run=false','--filter',target,script,...args];
 const start = Date.now();
 const result = spawnSync('pnpm.cmd',argv,{cwd:root,env,encoding:'utf8',shell:true,windowsHide:true,timeout:300000,maxBuffer:30*1024*1024});
 let log = (result.stdout||'')+(result.stderr||'')+(result.error?.message||'');
 for (const name of ['CLERK_SECRET_KEY','JWT_SECRET','RATE_LIMIT_SECRET','NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY']) log = log.replaceAll(env[name],'[synthetic omitted]');
 log = log.replace(/[A-Z]:[\\/]+Users[\\/]+[^\\/]+[\\/]+[^\r\n]*?Kortek-Booking/gi, '<workspace>');
 fs.writeFileSync(path.join(__dirname,label+'.log'),log);
 const row = {label,command:'pnpm '+argv.join(' '),exitCode:result.status,elapsedMs:Date.now()-start};
 results.push(row); console.log(JSON.stringify(row));
}
fs.writeFileSync(path.join(__dirname,selected?selected+'.json':'checks.json'),JSON.stringify(results,null,2)+'\n');
process.exitCode = results.every(row=>row.exitCode===0)?0:1;
