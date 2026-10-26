import type { TrackingConfig } from "@/lib/consent"

type Win = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] } }

function addScript(id: string, src: string) {
  if (document.getElementById(id)) {
    return
  }
  const script = document.createElement("script")
  script.id = id
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

/** Google Analytics 4 z trybem zgody (domyślnie wszystko odrzucone, potem tylko analityka). */
export function loadGa4(id: string) {
  const w = window as Win
  if (w.gtag) {
    return
  }
  w.dataLayer = w.dataLayer ?? []
  w.gtag = function gtag() {
    // gtag wymaga obiektu arguments, nie tablicy
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments)
  }
  w.gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" })
  w.gtag("consent", "update", { analytics_storage: "granted" })
  w.gtag("js", new Date())
  w.gtag("config", id, { anonymize_ip: true })
  addScript("patrix-ga4", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`)
}

/** Meta Pixel: kolejka poleceń w formacie oczekiwanym przez fbevents.js, do czasu wczytania skryptu. */
export function loadMetaPixel(id: string) {
  const w = window as Win & { _fbq?: unknown }
  if (w.fbq) {
    return
  }
  type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; push: unknown; loaded: boolean; version: string }
  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) {
      fbq.callMethod(...args)
    } else {
      fbq.queue.push(args)
    }
  }) as Fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = "2.0"
  fbq.queue = []
  w.fbq = fbq
  w._fbq = fbq
  fbq("init", id)
  fbq("track", "PageView")
  addScript("patrix-meta-pixel", "https://connect.facebook.net/en_US/fbevents.js")
}

export function trackMetaPageView() {
  ;(window as Win).fbq?.("track", "PageView")
}

export function startTrackers(config: TrackingConfig, consent: { analytics: boolean; marketing: boolean }) {
  if (config.ga4 && consent.analytics) {
    loadGa4(config.ga4)
  }
  if (config.metaPixel && consent.marketing) {
    loadMetaPixel(config.metaPixel)
  }
}
