"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { consentCookie, consentNeeded, OPEN_CONSENT_EVENT, readConsentCookie, type Consent, type TrackingConfig } from "@/lib/consent"
import { startTrackers, trackMetaPageView } from "./trackers"

type Choice = { analytics: boolean; marketing: boolean }

/**
 * Baner zgód: „Akceptuj wszystkie” i „Odrzuć opcjonalne” są równorzędne, ustawienia pozwalają wybrać kategorie.
 * Bez zgody nie ładujemy żadnego skryptu narzędzia. Cofnięcie zgody przeładowuje stronę, żeby wyładować skrypty.
 */
export function ConsentManager({ config }: { config: TrackingConfig }) {
  const pathname = usePathname()
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState(false)
  const [draft, setDraft] = useState<Choice>({ analytics: false, marketing: false })
  const firstPath = useRef(pathname)

  useEffect(() => {
    if (!consentNeeded(config)) {
      return
    }
    const saved = readConsentCookie(document.cookie)
    // Odczyt cookie możliwy dopiero w przeglądarce (strona jest renderowana bez danych klienta).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(saved)
    if (saved) {
      startTrackers(config, saved)
    } else {
      setOpen(true)
    }
    const reopen = () => {
      const current = readConsentCookie(document.cookie)
      setDraft({ analytics: current?.analytics ?? false, marketing: current?.marketing ?? false })
      setDetails(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_CONSENT_EVENT, reopen)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen)
  }, [config])

  // Meta Pixel nie śledzi zmian adresu w aplikacji jednostronicowej (GA4 robi to sam).
  useEffect(() => {
    if (pathname !== firstPath.current && consent?.marketing) {
      trackMetaPageView()
    }
  }, [pathname, consent])

  if (!consentNeeded(config) || !open) {
    return null
  }

  const save = (choice: Choice) => {
    const revoked = (consent?.analytics && !choice.analytics) || (consent?.marketing && !choice.marketing)
    document.cookie = consentCookie(choice) + (location.protocol === "https:" ? "; Secure" : "")
    const saved = readConsentCookie(document.cookie)
    setConsent(saved)
    setOpen(false)
    if (revoked) {
      window.location.reload()
      return
    }
    startTrackers(config, choice)
  }

  return (
    <section
      aria-label="Zgody na pliki cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface shadow-lg"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 md:px-6">
        <h2 className="font-display text-lg font-bold">Pliki cookies</h2>
        <p className="text-sm">
          Używamy plików niezbędnych do działania sklepu (koszyk, logowanie, motyw). Za Twoją zgodą użyjemy też narzędzi
          {config.ga4 ? " analitycznych (Google Analytics)" : ""}
          {config.ga4 && config.metaPixel ? " i" : ""}
          {config.metaPixel ? " marketingowych (Meta Pixel)" : ""}. Zgodę możesz w każdej chwili zmienić w stopce („Ustawienia cookies”).{" "}
          <Link href="/polityka-prywatnosci" className="text-accent-strong underline">
            Polityka prywatności
          </Link>
        </p>
        {details ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Kategorie plików cookies</legend>
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <input type="checkbox" checked disabled className="size-5" />
              Niezbędne (zawsze włączone)
            </label>
            {config.ga4 ? (
              <label className="flex min-h-9 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.analytics}
                  onChange={(e) => setDraft((d) => ({ ...d, analytics: e.target.checked }))}
                  className="size-5 accent-accent-strong"
                />
                Analityczne: statystyki odwiedzin (Google Analytics 4)
              </label>
            ) : null}
            {config.metaPixel ? (
              <label className="flex min-h-9 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.marketing}
                  onChange={(e) => setDraft((d) => ({ ...d, marketing: e.target.checked }))}
                  className="size-5 accent-accent-strong"
                />
                Marketingowe: mierzenie skuteczności reklam (Meta Pixel)
              </label>
            ) : null}
          </fieldset>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button variant="secondary" onClick={() => save({ analytics: false, marketing: false })}>
            Odrzuć opcjonalne
          </Button>
          {details ? (
            <Button variant="secondary" onClick={() => save(draft)}>
              Zapisz wybór
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setDetails(true)}>
              Ustawienia
            </Button>
          )}
          <Button variant="secondary" onClick={() => save({ analytics: !!config.ga4, marketing: !!config.metaPixel })}>
            Akceptuj wszystkie
          </Button>
        </div>
      </div>
    </section>
  )
}

/** Przycisk w stopce do zmiany zgód; widoczny tylko, gdy sklep używa narzędzi wymagających zgody. */
export function ConsentSettingsButton({ config }: { config: TrackingConfig }) {
  if (!consentNeeded(config)) {
    return null
  }
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))} className="text-left underline hover:text-accent-strong">
      Ustawienia cookies
    </button>
  )
}
