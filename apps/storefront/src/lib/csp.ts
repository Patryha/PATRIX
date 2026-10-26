/**
 * Polityka CSP sklepu (D-038). Wszystko domyślnie tylko z własnej domeny; zewnętrzne adresy dochodzą wyłącznie
 * dla narzędzi skonfigurowanych identyfikatorem (GA4, Meta Pixel), które i tak ładują się dopiero po zgodzie.
 * `script-src` zawiera 'unsafe-inline', bo Next.js z częściowym prerenderowaniem wstrzykuje skrypty z danymi strony,
 * których nie da się podpisać nonce (statyczna powłoka) ani hashem (treść zależy od strony).
 */
export type CspOptions = { dev: boolean; https: boolean; ga4: boolean; metaPixel: boolean }

const GA4 = {
  script: ["https://www.googletagmanager.com"],
  connect: ["https://*.google-analytics.com", "https://*.analytics.google.com", "https://www.googletagmanager.com"],
  img: ["https://*.google-analytics.com", "https://www.googletagmanager.com"],
}
const META = {
  script: ["https://connect.facebook.net"],
  connect: ["https://www.facebook.com", "https://connect.facebook.net"],
  img: ["https://www.facebook.com"],
}

export function buildCsp({ dev, https, ga4, metaPixel }: CspOptions): string {
  const tools = [ga4 ? GA4 : null, metaPixel ? META : null].filter((t) => t !== null)
  const extra = (key: "script" | "connect" | "img") => tools.flatMap((t) => t[key])
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    ["script-src", "'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), ...extra("script")],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:", ...extra("img")],
    ["font-src", "'self'"],
    ["connect-src", "'self'", ...(dev ? ["ws:"] : []), ...extra("connect")],
    ["frame-src", "'none'"],
    ["worker-src", "'self'", "blob:"],
    ["manifest-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
  ]
  if (https) {
    directives.push(["upgrade-insecure-requests"])
  }
  return directives.map((d) => d.join(" ")).join("; ")
}
