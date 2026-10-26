import type { NextConfig } from "next"
import { trackingConfig } from "./src/lib/consent"
import { buildCsp } from "./src/lib/csp"

const isProd = process.env.NODE_ENV === "production"

// Zdjęcia produktów: lokalny backend (dev) lub magazyn S3/CDN (prod), konfigurowane zmienną.
const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "localhost")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean)

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  {
    key: "Content-Security-Policy",
    value: buildCsp({
      dev: !isProd,
      https: (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://"),
      ga4: !!trackingConfig.ga4,
      metaPixel: !!trackingConfig.metaPixel,
    }),
  },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
]

const nextConfig: NextConfig = {
  // Obraz Docker: samodzielny serwer z wkompilowaną konfiguracją (bez src/ i pełnego node_modules w obrazie).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    remotePatterns: imageHosts.flatMap((hostname) => [
      { protocol: "https" as const, hostname },
      ...(isProd ? [] : [{ protocol: "http" as const, hostname }]),
    ]),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
