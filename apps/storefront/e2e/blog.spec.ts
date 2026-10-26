import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test.describe("blog", () => {
  test("lista prowadzi do wpisu z treścią, linkiem do produktu i produktami pod wpisem", async ({ page }) => {
    await page.goto("/blog")
    await expect(page.getByRole("heading", { name: "Blog", level: 1 })).toBeVisible()
    await page.getByRole("link", { name: "[TEST] Wpis testowy" }).click()

    await expect(page).toHaveURL(/\/blog\/test-wpis$/)
    await expect(page.getByRole("heading", { name: "[TEST] Wpis testowy", level: 1 })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Sekcja testowa", level: 2 })).toBeVisible()
    await expect(page.locator("article strong", { hasText: "pogrubieniem" })).toBeVisible()
    await expect(page.locator("article li")).toHaveCount(2)
    const related = page.getByRole("region", { name: "Produkty z tego wpisu" })
    await expect(related.getByRole("link", { name: "[TEST] Krem do rąk" })).toBeVisible()
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t))
    expect(ld).toEqual(expect.arrayContaining([expect.objectContaining({ "@type": "BlogPosting", headline: "[TEST] Wpis testowy" })]))

    const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()
    expect(a11y.violations).toEqual([])

    await page.getByRole("link", { name: "kremu testowego" }).click()
    await expect(page).toHaveURL(/\/produkt\/test-krem-do-rak$/)
  })

  test("nieistniejący wpis pokazuje stronę 404, a opublikowany jest w mapie strony", async ({ page, request }) => {
    await page.goto("/blog/nie-ma-takiego-wpisu")
    await expect(page.getByRole("heading", { name: "Nie znaleźliśmy tej strony" })).toBeVisible()
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached()
    const xml = await (await request.get("/sitemap.xml")).text()
    expect(xml).toContain("/blog/test-wpis</loc>")
    expect(xml).toContain("/blog</loc>")
  })
})
