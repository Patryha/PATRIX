import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

// Wymaga katalogu testowego: `npm run seed:test-catalog` w apps/backend (produkty oznaczone [TEST]).

test.describe("karta produktu", () => {
  test("pokazuje warianty, cenę z informacją Omnibus, dane prawne i JSON-LD", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    await page.goto("/produkt/test-zel-do-prania")
    await expect(page.getByRole("heading", { level: 1, name: "[TEST] Żel do prania kolorów" })).toBeVisible()
    await expect(page.getByRole("link", { name: "[TEST] Marka testowa" })).toBeVisible()

    // Wariant 1 l w promocji: cena, cena przed obniżką i najniższa cena z 30 dni
    await expect(page.getByText("24,99 zł").first()).toBeVisible()
    await expect(page.getByText("Najniższa cena z 30 dni przed obniżką: 29,99 zł")).toBeVisible()
    await expect(page.getByText("TEST-PRANIE-1L")).toBeVisible()

    // Zmiana wariantu zmienia cenę i SKU
    await page.getByText("2 l", { exact: true }).click()
    await expect(page.getByText("49,99 zł").first()).toBeVisible()
    await expect(page.getByText("TEST-PRANIE-2L")).toBeVisible()
    await expect(page.getByText(/Najniższa cena z 30 dni/)).toHaveCount(0)

    // Dane prawne (CLP, producent)
    await page.getByText("Stosowanie i bezpieczeństwo").click()
    await expect(page.getByText("Uwaga", { exact: true })).toBeVisible()
    await expect(page.getByText("GHS07: Działanie drażniące lub szkodliwe")).toBeVisible()
    await page.getByText("Producent i bezpieczeństwo produktu").click()
    await expect(page.getByText(/\[TEST\] Producent testowy/)).toBeVisible()

    const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
    const product = ld.map((s) => JSON.parse(s)).find((d) => d["@type"] === "Product")
    expect(product.brand.name).toBe("[TEST] Marka testowa")
    expect(product.offers).toHaveLength(2)
    expect(errors).toEqual([])
  })

  test("żywność: skład, alergeny i tabela wartości odżywczych, cena jednostkowa", async ({ page }) => {
    await page.goto("/produkt/test-ciastka-maslane")
    await expect(page.getByText("47,45 zł / kg")).toBeVisible()
    await page.locator("summary", { hasText: /^Skład/ }).click()
    await expect(page.getByText("[TEST] gluten")).toBeVisible()
    await page.locator("summary", { hasText: "Wartości odżywcze" }).click()
    await expect(page.getByRole("table", { name: /Wartości odżywcze/ })).toBeVisible()
  })

  test("galeria przełącza zdjęcia z klawiatury", async ({ page }) => {
    await page.goto("/produkt/test-zel-do-prania")
    const second = page.getByRole("button", { name: "Pokaż zdjęcie 2" })
    await second.focus()
    await page.keyboard.press("Enter")
    await expect(second).toHaveAttribute("aria-pressed", "true")
  })

  test("produkt niedostępny jest oznaczony", async ({ page }) => {
    await page.goto("/produkt/test-krem-do-rak")
    await expect(page.getByText("Chwilowo niedostępny").first()).toBeVisible()
  })

  test("spełnia WCAG 2.2 AA (axe)", async ({ page }) => {
    await page.goto("/produkt/test-zel-do-prania")
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe("listing", () => {
  test("filtruje po dostępności i sortuje po cenie (bez JavaScriptu też działa przez GET)", async ({ page }) => {
    await page.goto("/szukaj?q=TEST")
    const cards = page.getByRole("article")
    // 4 produkty [TEST]: żel, ciastka, krem i zestaw kremów (zestaw niedostępny, bo krem nie ma stanu)
    await expect(cards).toHaveCount(4)

    await page.getByLabel("Sortuj").selectOption("price_asc")
    await page.getByRole("button", { name: "Pokaż wyniki" }).click()
    await expect(page).toHaveURL(/sort=price_asc/)
    await expect(cards.first()).toContainText("[TEST] Ciastka maślane")

    await page.getByLabel("Tylko dostępne").check()
    await page.getByRole("button", { name: "Pokaż wyniki" }).click()
    await expect(page).toHaveURL(/dostepne=1/)
    await expect(cards).toHaveCount(2)
    await expect(page.getByRole("link", { name: "Wyczyść filtry" })).toBeVisible()
  })

  test("filtr marki w kategorii i usuwanie filtra", async ({ page }) => {
    await page.goto("/kategoria/srodki-do-prania?marka=test-marka")
    await expect(page.getByRole("article")).toHaveCount(1)
    await page.getByRole("link", { name: "Usuń filtr marki [TEST] Marka testowa" }).click()
    await expect(page).toHaveURL(/\/kategoria\/srodki-do-prania$/)
  })

  test("strona marki pokazuje jej produkty", async ({ page }) => {
    await page.goto("/marka/test-marka")
    await expect(page.getByRole("heading", { level: 1, name: "[TEST] Marka testowa" })).toBeVisible()
    await expect(page.getByRole("article")).toHaveCount(4)
  })

  test("listing spełnia WCAG 2.2 AA (axe)", async ({ page }) => {
    await page.goto("/kategoria/srodki-do-prania")
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()
    expect(results.violations).toEqual([])
  })
})
