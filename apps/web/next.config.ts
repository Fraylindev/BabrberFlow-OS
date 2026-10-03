import type { NextConfig } from 'next';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resolveWebApiBase, validateWebDeploymentConfig } from './lib/web-deployment-config.ts';

// Only public configuration is bound to the artifact; rotating the private key
// does not require a rebuild. Next freezes NEXT_PUBLIC_* during compilation.
function deploymentBuildId(): string {
  const configuration = [
    process.env.DEPLOY_ENV,
    process.env.WEB_PUBLIC_ORIGIN ?? '',
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  ];
  return `kortek-${createHash('sha256').update(JSON.stringify(configuration)).digest('hex')}`;
}

const nextConfig: NextConfig = {
  async generateBuildId() {
    return `${deploymentBuildId()}-${randomUUID()}`;
  },
  async rewrites() {
    const apiBase = resolveWebApiBase(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV);
    return [
      { source: '/media-proxy/:slug/:token', destination: `${apiBase}/public/:slug/media/:token` },
    ];
  },
  async headers() {
    return [
      ...['/:slug/cuenta/:path*', '/:slug/mis-reservas/:path*', '/:slug/mi-perfil'].map(source => ({ source, headers: [{ key: 'Cache-Control', value: 'private, no-store' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] })),
      {
        source: '/dashboard/settings/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/dashboard/media/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/media-proxy/:slug/:token',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
  images: {
    // Fotografía temporal de Unsplash. El reemplazo por material propio
    // requiere una entrega de marca autorizada.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default function configure(phase: string): NextConfig {
  validateWebDeploymentConfig(phase);
  if (phase === 'phase-production-server') {
    let builtId: string;
    try {
      builtId = readFileSync(path.join(process.cwd(), '.next', 'BUILD_ID'), 'utf8').trim();
    } catch {
      throw new Error('WEB_CONFIG_INVALID variable=BUILD_ARTIFACT');
    }
    if (!builtId.startsWith(`${deploymentBuildId()}-`)) {
      throw new Error('WEB_CONFIG_INVALID variable=BUILD_ENVIRONMENT');
    }
  }
  return nextConfig;
}
