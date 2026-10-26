import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

// Strona główna z CMS: wersja początkowa z seeda (npm run seed) + katalog testowy [TEST].

test.describe("strona główna z CMS", () => {
  test("sekcje w kolejności z panelu: slider, kategorie, nowości, promocje, o marce", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1, name: "Niemiecka jakość na co dzień" })).toBeVisible()
    const headings = await page.getByRole("heading", { level: 2 }).allTextContents()
    const order = ["Kategorie", "Nowości", "Promocje tygodnia", "PATRIX: niemiecka jakość na co dzień"].map((h) => headings.indexOf(h))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)

    // Promocje: tylko produkty z aktywną obniżką (żel w cenniku testowym), karta bez przekreślonej ceny (Omnibus na karcie produktu)
    const sale = page.getByRole("region", { name: "Promocje tygodnia" })
    await expect(sale.getByRole("link", { name: "[TEST] Żel do prania kolorów" })).toBeVisible()
    await expect(sale.getByRole("link", { name: "[TEST] Ciastka maślane" })).toHaveCount(0)
    await expect(sale.locator("s, del")).toHaveCount(0)
  })

  test("ostatnio oglądane: zapis w przeglądarce, widoczne na stronie głównej i karcie innego produktu", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("region", { name: "Ostatnio oglądane" })).toHaveCount(0)
    await page.goto("/produkt/test-ciastka-maslane")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await page.goto("/produkt/test-zel-do-prania")
    const onProduct = page.getByRole("region", { name: "Ostatnio oglądane" })
    await expect(onProduct.getByRole("link", { name: "[TEST] Ciastka maślane" })).toBeVisible()
    await expect(onProduct.getByRole("link", { name: "[TEST] Żel do prania kolorów" })).toHaveCount(0)
    await page.goto("/")
    const recent = page.getByRole("region", { name: "Ostatnio oglądane" })
    const links = recent.getByRole("heading", { level: 3 })
    await expect(links.first()).toHaveText("[TEST] Żel do prania kolorów")
    await expect(links.nth(1)).toHaveText("[TEST] Ciastka maślane")
  })

  test("strona główna z sekcjami CMS spełnia WCAG 2.2 AA", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("region", { name: "Promocje tygodnia" }).getByRole("link").first().waitFor()
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([])
  })

  test("podgląd bez ważnego tokenu nic nie pokazuje i nie jest indeksowany", async ({ page }) => {
    await page.goto("/podglad?token=nieprawidlowy-token-podgladu-123")
    await expect(page.getByRole("heading", { name: "Podgląd niedostępny" })).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
  })
})
