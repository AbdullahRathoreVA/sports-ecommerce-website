import type { NextConfig } from "next";

// Demo review fixtures must never reach the live site (src/lib/reviews/demo.ts).
if (process.env.VERCEL_ENV === "production" && process.env.REVIEWS_DEMO === "1") {
  throw new Error("REVIEWS_DEMO=1 is set on production — refusing to build: demo reviews would appear as real customer reviews.");
}

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
