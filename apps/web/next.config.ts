import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotografía temporal de Unsplash (licencia libre, uso comercial
    // permitido) para la Fase 1 de la landing — ver PROJECT_MASTER.md
    // §42 sobre el reemplazo por material propio más adelante.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
