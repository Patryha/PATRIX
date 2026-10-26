import { expect, test } from "@playwright/test"

test.describe("SEO", () => {
  test("mapa strony zawiera produkty, kategorie i marki, bez stron noindex", async ({ request }) => {
    const res = await request.get("/sitemap.xml")
    expect(res.status()).toBe(200)
    const xml = await res.text()
    expect(xml).toContain("/produkt/test-krem-do-rak</loc>")
    expect(xml).toContain("/kategoria/srodki-do-prania</loc>")
    expect(xml).toContain("/marka/test-marka</loc>")
    expect(xml).not.toContain("/koszyk")
    expect(xml).not.toContain("/szukaj")
  })

  test("robots.txt blokuje indeksowanie poza produkcją", async ({ request }) => {
    const text = await (await request.get("/robots.txt")).text()
    expect(text).toMatch(/Disallow: \/\s*$/m)
  })

  test("przekierowanie 301 z panelu prowadzi na nowy adres (także z ukośnikiem na końcu)", async ({ page, request }) => {
    const res = await request.get("/test-stary-adres?utm_source=test", { maxRedirects: 0 })
    expect(res.status()).toBe(301)
    expect(res.headers()["location"]).toMatch(/\/produkt\/test-krem-do-rak\?utm_source=test$/)
    // Next.js najpierw usuwa końcowy ukośnik (308), potem działa przekierowanie z panelu
    await page.goto("/test-stary-adres/")
    await expect(page).toHaveURL(/\/produkt\/test-krem-do-rak$/)
    await expect(page.getByRole("heading", { name: "[TEST] Krem do rąk", level: 1 })).toBeVisible()
  })
})
