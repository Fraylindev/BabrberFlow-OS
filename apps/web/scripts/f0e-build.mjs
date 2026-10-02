// Build local aislado: no modifica archivos .env ni flags funcionales, ni inicia servicios.
import { spawnSync } from 'node:child_process';
const result = spawnSync(process.env.ComSpec, ['/d', '/s', '/c', 'pnpm --filter web build'], {
  cwd: new URL('../../../', import.meta.url),
  env: { ...process.env, DEPLOY_ENV: 'development', NEXT_PUBLIC_API_URL: 'http://localhost:3000' },
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
