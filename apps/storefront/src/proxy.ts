import { NextResponse, type NextRequest } from "next/server"
import { buildRedirectMap, normalizeRequestPath, type RedirectTarget } from "./lib/redirects"

const TTL_MS = 60_000
const RETRY_MS = 10_000
const backendUrl = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

let cache: { map: Map<string, RedirectTarget>; expires: number } = { map: new Map(), expires: 0 }
let loading: Promise<void> | null = null

/** Lista przekierowań z backendu w pamięci na minutę; awaria backendu nie blokuje sklepu (zostaje poprzednia lista). */
async function redirects() {
  if (Date.now() >= cache.expires && !loading) {
    loading = fetch(`${backendUrl}/store/patrix/redirects`, { headers: { "x-publishable-api-key": publishableKey }, signal: AbortSignal.timeout(2000) })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const body = (await res.json()) as { redirects: { from: string; to: string; permanent: boolean }[] }
        cache = { map: buildRedirectMap(body.redirects), expires: Date.now() + TTL_MS }
      })
      .catch(() => {
        cache = { map: cache.map, expires: Date.now() + RETRY_MS }
      })
      .finally(() => {
        loading = null
      })
  }
  if (loading && cache.expires === 0) {
    await loading
  }
  return cache.map
}

/** Przekierowania 301/302 z panelu (Etap 8). */
export async function proxy(request: NextRequest) {
  const target = (await redirects()).get(normalizeRequestPath(request.nextUrl.pathname))
  if (!target) {
    return NextResponse.next()
  }
  const url = request.nextUrl.clone()
  url.pathname = target.to
  return NextResponse.redirect(url, target.permanent ? 301 : 302)
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:png|jpe?g|gif|svg|webp|avif|ico|css|js|woff2?|map)$).*)"],
}
