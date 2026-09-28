const releasePhases = new Set(['phase-production-build', 'phase-production-server']);

function invalid(name: string): never {
  throw new Error(`WEB_CONFIG_INVALID variable=${name}`);
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  return value || invalid(name);
}

function localHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    /^127\./.test(host) ||
    ['[::1]', '[::]', '0.0.0.0'].includes(host)
  );
}

function origin(value: string, name: string, local: boolean): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return invalid(name);
  }
  if (
    url.origin !== value ||
    url.username ||
    url.password ||
    value.includes('*') ||
    (local
      ? !localHost(url.hostname) || !['http:', 'https:'].includes(url.protocol)
      : localHost(url.hostname) || url.protocol !== 'https:')
  ) {
    invalid(name);
  }
  return url;
}

/** Public API URLs are inlined by Next. Never silently use localhost in a build. */
export function resolveWebApiBase(value: string | undefined, nodeEnv: string | undefined): string {
  const configured = value?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (nodeEnv === 'production') throw new Error('La aplicación no está configurada.');
  return 'http://localhost:3000';
}

/** Run from Next config at build and start; does not log configuration values. */
export function validateWebDeploymentConfig(
  phase: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const deployment = env.DEPLOY_ENV?.trim();
  if (!releasePhases.has(phase) && (!deployment || deployment === 'development')) return;
  if (!['development', 'staging', 'production'].includes(deployment ?? '')) invalid('DEPLOY_ENV');
  const development = deployment === 'development';
  const api = origin(required(env, 'NEXT_PUBLIC_API_URL'), 'NEXT_PUBLIC_API_URL', development);
  const publicKey = required(env, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  const secretKey = required(env, 'CLERK_SECRET_KEY');
  const live = publicKey.startsWith('pk_live_');
  const test = publicKey.startsWith('pk_test_');
  if ((!live && !test) || (development && !test) || (deployment === 'production' && !live)) {
    invalid('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  }
  const secretPrefix = live ? 'sk_live_' : 'sk_test_';
  if (!secretKey.startsWith(secretPrefix) || secretKey.length <= secretPrefix.length)
    invalid('CLERK_SECRET_KEY');
  const prefix = live ? 'pk_live_' : 'pk_test_';
  const decoded = Buffer.from(publicKey.slice(prefix.length), 'base64url').toString('utf8');
  if (!decoded.endsWith('$')) invalid('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  const issuerHost = decoded.slice(0, -1);
  let issuer: URL;
  try {
    issuer = new URL(`https://${issuerHost}`);
  } catch {
    return invalid('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  }
  if (
    !issuerHost ||
    issuer.hostname !== issuerHost ||
    issuer.port ||
    issuer.username ||
    issuer.password
  ) {
    invalid('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  }
  if (development) return;
  const web = origin(required(env, 'WEB_PUBLIC_ORIGIN'), 'WEB_PUBLIC_ORIGIN', false);
  const expectedWeb =
    deployment === 'production'
      ? 'https://booking.kortek.cloud'
      : 'https://qa.booking.kortek.cloud';
  const expectedApi =
    deployment === 'production'
      ? 'https://api.booking.kortek.cloud'
      : 'https://api.staging.booking.kortek.cloud';
  if (web.origin !== expectedWeb) invalid('WEB_PUBLIC_ORIGIN');
  if (api.origin !== expectedApi) invalid('NEXT_PUBLIC_API_URL');
  if (live && issuer.hostname !== `clerk.${web.hostname}`)
    invalid('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
}
