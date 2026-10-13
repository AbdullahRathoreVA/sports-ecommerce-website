import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF invoices render on the server with react-pdf (its layout engine ships as wasm).
  serverExternalPackages: ["@react-pdf/renderer"],
  reactStrictMode: true,
  poweredByHeader: false,
  // Fonts read from disk by the link-preview image route.
  outputFileTracingIncludes: { "/opengraph-image": ["./assets/fonts/**"] },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 420, 640, 828, 1080, 1280, 1600, 1920, 2560],
    // Next 16 allows only quality 75 by default; every photo is served at 90 instead (sharp on 3x phones and retina).
    qualities: [90],
    imageSizes: [56, 96, 150, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@react-three/drei"],
  },
  // The factory showcase page was removed (the photos were not Alrobel's own factory).
  async redirects() {
    return [{ source: "/factory", destination: "/about", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
      {
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
