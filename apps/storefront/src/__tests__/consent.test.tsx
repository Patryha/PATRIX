import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ConsentManager, ConsentSettingsButton } from "@/components/consent/consent-manager"
import { CONSENT_COOKIE, consentCookie, parseConsent, readConsentCookie, trackingConfigFrom } from "@/lib/consent"

vi.mock("next/navigation", () => ({ usePathname: () => "/" }))

const clearCookies = () => {
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`
}
const scripts = () => [...document.querySelectorAll("script[src]")].map((s) => s.getAttribute("src"))

describe("consent library", () => {
  it("accepts only valid tool identifiers", () => {
    expect(trackingConfigFrom({ ga4: "G-ABC1234", metaPixel: "1234567890" })).toEqual({ ga4: "G-ABC1234", metaPixel: "1234567890" })
    expect(trackingConfigFrom({ ga4: "UA-1", metaPixel: "<script>" })).toEqual({ ga4: null, metaPixel: null })
  })

  it("round-trips the cookie and rejects old versions and garbage", () => {
    const cookie = consentCookie({ analytics: true, marketing: false }, new Date("2026-10-26T10:00:00Z"))
    expect(cookie).toContain("Max-Age=15552000")
    const value = cookie.split(";")[0]
    expect(readConsentCookie(`a=1; ${value}`)).toEqual({ v: 1, analytics: true, marketing: false, at: "2026-10-26T10:00:00.000Z" })
    expect(parseConsent(encodeURIComponent(JSON.stringify({ v: 0, analytics: true, marketing: true, at: "x" })))).toBeNull()
    expect(parseConsent("%%%")).toBeNull()
  })
})

describe("ConsentManager", () => {
  beforeEach(clearCookies)
  afterEach(() => {
    cleanup()
    clearCookies()
    document.head.querySelectorAll("script").forEach((s) => s.remove())
    delete (window as { gtag?: unknown }).gtag
    delete (window as { fbq?: unknown }).fbq
  })

  it("renders nothing and loads nothing when no tools are configured", () => {
    const { container } = render(<ConsentManager config={{ ga4: null, metaPixel: null }} />)
    expect(container).toBeEmptyDOMElement()
    render(<ConsentSettingsButton config={{ ga4: null, metaPixel: null }} />)
    expect(screen.queryByRole("button", { name: "Ustawienia cookies" })).toBeNull()
  })

  it("loads no script before consent and none after rejecting", () => {
    render(<ConsentManager config={{ ga4: "G-TEST1234", metaPixel: "1234567890" }} />)
    expect(screen.getByRole("region", { name: "Zgody na pliki cookies" })).toBeVisible()
    expect(scripts()).toEqual([])
    fireEvent.click(screen.getByRole("button", { name: "Odrzuć opcjonalne" }))
    expect(screen.queryByRole("region", { name: "Zgody na pliki cookies" })).toBeNull()
    expect(readConsentCookie(document.cookie)).toMatchObject({ analytics: false, marketing: false })
    expect(scripts()).toEqual([])
  })

  it("loads only the chosen category and lets the customer reopen settings", () => {
    render(
      <>
        <ConsentManager config={{ ga4: "G-TEST1234", metaPixel: "1234567890" }} />
        <ConsentSettingsButton config={{ ga4: "G-TEST1234", metaPixel: "1234567890" }} />
      </>
    )
    fireEvent.click(screen.getByRole("button", { name: "Ustawienia" }))
    fireEvent.click(screen.getByRole("checkbox", { name: /Analityczne/ }))
    fireEvent.click(screen.getByRole("button", { name: "Zapisz wybór" }))
    expect(scripts()).toEqual(["https://www.googletagmanager.com/gtag/js?id=G-TEST1234"])

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Ustawienia cookies" }))
    })
    expect(screen.getByRole("checkbox", { name: /Analityczne/ })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: /Marketingowe/ })).not.toBeChecked()
  })
})
