import type { NextConfig } from "next"

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
  // Bazowa polityka CSP; ścisłe script-src z nonce: Etap 9 (wymaga uzgodnienia z dostawcami płatności i analityki).
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
]

const nextConfig: NextConfig = {
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
