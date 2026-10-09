// Reutiliza el ciclo PG18 de guest-postgres-run sin modificar sus bytes.
// Solo bases UUID _test propias; ningún dotenv, proveedor o base compartida.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const original = path.join(__dirname, 'guest-postgres-run.cjs');
const phase = process.env.GUEST_SUITE_PHASE || 'before';
assert.match(phase, /^(before|after)$/);
const config = path.join(root, '.tmp', `guest-suite-${phase}.config.ts`);
fs.mkdirSync(path.dirname(config), { recursive: true });
const baseConfig = path
  .join(root, 'apps/web/playwright.config.ts')
  .replaceAll('\\', '/');
fs.writeFileSync(
  config,
  `import base from ${JSON.stringify(baseConfig)};
export default {...base, testDir:${JSON.stringify(path.join(root, 'apps/web/e2e'))},
  outputDir:${JSON.stringify(path.join(root, '.tmp', `guest-suite-${phase}-browser`))},
  reporter:[['json',{outputFile:${JSON.stringify(path.join(root, '.tmp', `guest-suite-${phase}-browser.json`))}}]],
  workers:2,retries:0,use:{...base.use,serviceWorkers:'block',launchOptions:{args:['--host-resolver-rules=MAP * 127.0.0.1, EXCLUDE localhost, EXCLUDE 127.0.0.1']}},
  webServer:{...base.webServer,cwd:${JSON.stringify(path.join(root, 'apps/web'))},reuseExistingServer:false}};
`,
);
let source = fs.readFileSync(original, 'utf8');
function replace(from, to) {
  assert.ok(
    source.includes(from),
    'El helper PG18 cambió: revisar el adaptador',
  );
  source = source.replace(from, () => to);
}
replace(
  'const preload =',
  "env.pnpm_config_verify_deps_before_run = 'false';\nenv.NEXT_TELEMETRY_DISABLED = '1';\nconst preload =",
);
replace(
  'return text.replace(',
  "text = text.replace(/eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+/g, '[JWT omitted]');\n  return text.replace(",
);
replace(
  "'docs/quality/evidence/reserva-invitado-c1/postgres'",
  JSON.stringify(`.tmp/guest-suite-evidence/${phase}`),
);
const guard = path
  .join(__dirname, 'guest-network-guard.cjs')
  .replaceAll('\\', '/');
replace(
  'NODE_OPTIONS: `--require="${preload.replaceAll',
  'NODE_OPTIONS: `--require="' + guard + '" --require="${preload.replaceAll',
);
const from = source.indexOf('  const suites = [');
const to = source.indexOf('  for (const [suite, expected] of suites)', from);
assert.ok(from > 0 && to > from);
source = source.slice(0, from) + '  const suites = [];\n' + source.slice(to);
const pnpm = path.join(
  process.env.APPDATA,
  'npm/node_modules/pnpm/bin/pnpm.cjs',
);
assert.ok(fs.existsSync(pnpm));
replace(
  '\n}\nmain()',
  `
  const pnpm = ${JSON.stringify(pnpm)};
  const apiOutput = path.join(evidenceRoot, 'api.json');
  node(pnpm, ['--filter','api','test:e2e','--runInBand','--json','--outputFile='+apiOutput], 'api-e2e', migratorUrl, {
    C1_RUNTIME_DATABASE_URL:runtimeUrl,E2E_PRIMARY_DATABASE_NAME:'barberflow',E2E_PRIMARY_DATABASE_USER:'barberflow_runtime',
    NODE_ENV:'test',DEPLOY_ENV:'local',
  }, {cwd:root,allowFailure:true,timeout:900000});
  evidence.apiExitCode=evidence.commands.at(-1).exitCode;
  fs.writeFileSync(apiOutput, sanitize(fs.readFileSync(apiOutput,'utf8')));
  const apiResults=JSON.parse(fs.readFileSync(apiOutput,'utf8'));
  evidence.api={passed:apiResults.numPassedTests,failed:apiResults.numFailedTests,pending:apiResults.numPendingTests,total:apiResults.numTotalTests};
  const webEnv={CI:'1',DEPLOY_ENV:'development',NODE_ENV:'production',NEXT_PUBLIC_API_URL:'http://127.0.0.1:1',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_test_'+Buffer.from('synthetic.clerk.accounts.dev$').toString('base64'),
    CLERK_SECRET_KEY:'sk_test_synthetic_local_only',NEXT_FONT_GOOGLE_MOCKED_RESPONSES:path.join(root,'apps/web/e2e/fixtures/offline-fonts.cjs')};
  if(process.env.GUEST_SUITE_SKIP_BUILD!=='1') {
    node(pnpm,['--filter','web','build','--webpack'],'web-build',migratorUrl,webEnv,{cwd:root,allowFailure:true,timeout:900000});
    evidence.webBuildExitCode=evidence.commands.at(-1).exitCode;
  } else { evidence.reusesMatchingBuild=true; }
  node(pnpm,['--filter','web','test:browser','--config',${JSON.stringify(config)}],'web-browser',migratorUrl,webEnv,{cwd:root,allowFailure:true,timeout:900000});
  evidence.browserExitCode=evidence.commands.at(-1).exitCode;
  if(evidence.apiExitCode!==0||evidence.browserExitCode!==0)process.exitCode=1;
}\nmain()`,
);
const adapted = new Module(original, module);
adapted.filename = original;
adapted.paths = Module._nodeModulePaths(path.dirname(original));
adapted._compile(source, original);
