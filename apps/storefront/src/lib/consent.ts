/**
 * PATRIX: zgody na pliki cookies (D-035). Narzędzia opcjonalne (analityka, marketing) uruchamiają się dopiero po zgodzie;
 * bez skonfigurowanych narzędzi sklep używa tylko plików niezbędnych i nie pokazuje banera.
 */

export const CONSENT_COOKIE = "patrix_consent"
/** Zmiana listy narzędzi lub celów = nowa wersja, klient jest pytany ponownie. */
export const CONSENT_VERSION = 1
export const CONSENT_MAX_AGE_DAYS = 180

export type Consent = { v: number; analytics: boolean; marketing: boolean; at: string }
export type TrackingConfig = { ga4: string | null; metaPixel: string | null }

const GA4 = /^G-[A-Z0-9]{4,20}$/
const PIXEL = /^\d{5,20}$/

/** Identyfikatory narzędzi ze zmiennych środowiskowych; niepoprawne są ignorowane. */
export function trackingConfigFrom(env: { ga4?: string; metaPixel?: string }): TrackingConfig {
  return {
    ga4: env.ga4 && GA4.test(env.ga4) ? env.ga4 : null,
    metaPixel: env.metaPixel && PIXEL.test(env.metaPixel) ? env.metaPixel : null,
  }
}

export const trackingConfig = trackingConfigFrom({ ga4: process.env.NEXT_PUBLIC_GA4_ID, metaPixel: process.env.NEXT_PUBLIC_META_PIXEL_ID })

export const consentNeeded = (config: TrackingConfig) => !!(config.ga4 || config.metaPixel)

export function parseConsent(value: string | undefined | null): Consent | null {
  if (!value) {
    return null
  }
  try {
    const data = JSON.parse(decodeURIComponent(value)) as Partial<Consent>
    if (data.v !== CONSENT_VERSION || typeof data.analytics !== "boolean" || typeof data.marketing !== "boolean" || typeof data.at !== "string") {
      return null
    }
    return { v: data.v, analytics: data.analytics, marketing: data.marketing, at: data.at }
  } catch {
    return null
  }
}

export function consentCookie(choice: { analytics: boolean; marketing: boolean }, now = new Date()) {
  const value: Consent = { v: CONSENT_VERSION, analytics: choice.analytics, marketing: choice.marketing, at: now.toISOString() }
  return `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; SameSite=Lax`
}

export function readConsentCookie(cookieHeader: string) {
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
  return parseConsent(match?.slice(CONSENT_COOKIE.length + 1))
}

export const OPEN_CONSENT_EVENT = "patrix:open-consent"
