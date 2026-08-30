import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
