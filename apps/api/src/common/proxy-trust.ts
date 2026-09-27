import type { NestExpressApplication } from '@nestjs/platform-express';

export function configureProxyTrust(
  app: NestExpressApplication,
  env: NodeJS.ProcessEnv = process.env,
): void {
  // Remote deployments bind loopback behind Caddy, which replaces forwarding
  // headers. A remote/private network peer is never a trusted proxy.
  if (['staging', 'production'].includes(env.DEPLOY_ENV ?? '')) {
    app.set('trust proxy', 'loopback');
  }
}
