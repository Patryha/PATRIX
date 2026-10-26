import "server-only"

export const backendUrl = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
export const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:8000").replace(/\/$/, "")
/** Adres panelu administratora (Medusa Admin). Ścieżka /admin w sklepie przekierowuje tutaj. */
export const adminUrl = process.env.PATRIX_ADMIN_URL ?? `${backendUrl}/app`

const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "localhost")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean)
const isProd = process.env.NODE_ENV === "production"

/** Zdjęcie, które next/image może pokazać: ścieżka sklepu albo host z NEXT_PUBLIC_IMAGE_HOSTS (jak w next.config). */
export function displayableImage(url: string | null | undefined): url is string {
  if (!url) {
    return false
  }
  if (/^\/(?![/\\])/.test(url)) {
    return true
  }
  try {
    const { protocol, hostname } = new URL(url)
    return (protocol === "https:" || (!isProd && protocol === "http:")) && imageHosts.includes(hostname)
  } catch {
    return false
  }
}
