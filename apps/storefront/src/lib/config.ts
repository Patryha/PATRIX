import "server-only"

export const backendUrl = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
export const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:8000").replace(/\/$/, "")
/** Adres panelu administratora (Medusa Admin). Ścieżka /admin w sklepie przekierowuje tutaj. */
export const adminUrl = process.env.PATRIX_ADMIN_URL ?? `${backendUrl}/app`
