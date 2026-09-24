import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
    return [{ source: '/media-proxy/:slug/:token', destination: `${apiBase}/public/:slug/media/:token` }];
  },
  async headers() {
    return [{
      source: '/dashboard/settings/:path*',
      headers: [
        { key: 'Cache-Control', value: 'private, no-store' },
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      ],
    }, {
      source: '/dashboard/media/:path*',
      headers: [
        { key: 'Cache-Control', value: 'private, no-store' },
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      ],
    }, {
      source: '/media-proxy/:slug/:token',
      headers: [
        { key: 'Cache-Control', value: 'private, no-store' },
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      ],
    }];
  },
  images: {
    // Fotografía temporal de Unsplash. El reemplazo por material propio
    // requiere una entrega de marca autorizada.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
