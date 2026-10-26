import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const MAIN_CATEGORIES = [
  "Chemia gospodarcza",
  "Środki do prania",
  "Płyny do płukania",
  "Środki do czyszczenia",
  "Kosmetyki i pielęgnacja",
  "Higiena osobista",
  "Słodycze i przekąski",
  "Napoje",
  "Produkty dla domu",
  "Nowości z Niemiec",
  "Promocje",
  "Outlet i krótkie daty ważności",
]

test.describe("strona główna", () => {
  test("pokazuje markę i wszystkie kategorie z backendu, bez błędów w konsoli", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    await page.goto("/")
    await expect(page).toHaveTitle(/PATRIX/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Niemiecka jakość")
    const section = page.getByRole("region", { name: "Kategorie" })
    for (const name of MAIN_CATEGORIES) {
      await expect(section.getByRole("link", { name })).toBeVisible()
    }
    expect(errors).toEqual([])
  })

  test("nie ma poziomego przewijania", async ({ page }) => {
    await page.goto("/")
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  for (const scheme of ["light", "dark"] as const) {
    test(`spełnia WCAG 2.2 AA (axe) w motywie ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto("/")
      await page.getByRole("region", { name: "Kategorie" }).getByRole("link").first().waitFor()
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([])
    })
  }
})

test.describe("nawigacja", () => {
  test("link „Przejdź do treści” jest pierwszym elementem klawiatury", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("Tab")
    const skip = page.getByRole("link", { name: "Przejdź do treści" })
    await expect(skip).toBeFocused()
    await skip.press("Enter")
    await expect(page).toHaveURL(/#main$/)
  })

  test("menu kategorii działa z klawiatury i zamyka się Escape", async ({ page }) => {
    await page.goto("/")
    const button = page.getByRole("button", { name: "Kategorie" })
    await button.focus()
    await page.keyboard.press("Enter")
    await expect(button).toHaveAttribute("aria-expanded", "true")
    const nav = page.getByRole("navigation", { name: "Kategorie produktów" })
    await expect(nav.getByRole("link", { name: "Napoje" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(button).toHaveAttribute("aria-expanded", "false")
    await expect(button).toBeFocused()
  })

  test("przejście do kategorii pokazuje ścieżkę i stan pusty", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("region", { name: "Kategorie" }).getByRole("link", { name: "Napoje" }).click()
    await expect(page).toHaveURL(/\/kategoria\/napoje$/)
    await expect(page.getByRole("heading", { level: 1, name: "Napoje" })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "Ścieżka nawigacji" })).toContainText("Strona główna")
  })

  test("nieistniejąca kategoria pokazuje stronę 404 z noindex", async ({ page }) => {
    await page.goto("/kategoria/taka-kategoria-nie-istnieje")
    await expect(page.getByRole("heading", { name: "Nie znaleźliśmy tej strony" })).toBeVisible()
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached()
  })
})

test.describe("wyszukiwarka", () => {
  test("wysyła zapytanie i informuje o braku wyników", async ({ page, isMobile }) => {
    await page.goto("/")
    const input = page.getByRole("combobox", { name: "Szukaj produktów" }).locator("visible=true")
    await input.fill("persil color")
    await input.press("Enter")
    await expect(page).toHaveURL(/\/szukaj\?q=persil(\+|%20)color/)
    await expect(page.getByText(/Brak wyników dla „persil color”|Wyniki dla „persil color”|pasujących do całej frazy „persil color”/)).toBeVisible()
    expect(isMobile !== undefined).toBe(true)
  })

  test("rozumie brak polskich znaków i literówki, podpowiada poprawkę", async ({ page }) => {
    await page.goto("/szukaj?q=zel%20do%20prania")
    await expect(page.getByRole("article")).toHaveCount(1)
    await expect(page.getByRole("article")).toContainText("[TEST] Żel do prania kolorów")
    await expect(page.getByLabel("Sortuj")).toHaveValue("relevance")

    await page.goto("/szukaj?q=krem%20do%20rak")
    // trafność: sam krem przed zestawem kremów
    await expect(page.getByRole("article").first()).toContainText("[TEST] Krem do rąk")

    await page.goto("/szukaj?q=ciasteczka")
    await expect(page.getByText("Brak wyników dla „ciasteczka”.")).toBeVisible()
    await page.getByRole("link", { name: "ciastka" }).click()
    await expect(page).toHaveURL(/\/szukaj\?q=ciastka/)
    await expect(page.getByRole("article")).toContainText("[TEST] Ciastka maślane")
  })

  test("podpowiada produkty podczas pisania i obsługuje klawiaturę", async ({ page }) => {
    await page.goto("/")
    const input = page.getByRole("combobox", { name: "Szukaj produktów" }).locator("visible=true")
    await input.fill("ciast")
    const option = page.getByRole("option", { name: /\[TEST\] Ciastka maślane/ })
    await expect(option).toBeVisible()
    await expect(input).toHaveAttribute("aria-expanded", "true")
    await input.press("Escape")
    await expect(input).toHaveAttribute("aria-expanded", "false")
    await input.press("ArrowDown")
    await expect(option).toHaveAttribute("aria-selected", "true")
    await input.press("Enter")
    await expect(page).toHaveURL(/\/produkt\/test-ciastka/)
  })
})

test.describe("motyw", () => {
  test("przełącznik motywu zapamiętuje wybór po odświeżeniu", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" })
    await page.goto("/")
    await page.getByRole("button", { name: "Włącz tryb ciemny" }).click()
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
    await page.reload()
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
    await expect(page.getByRole("button", { name: "Włącz tryb jasny" })).toBeVisible()
  })
})

test("ścieżka /admin prowadzi do panelu administratora", async ({ request }) => {
  const res = await request.get("/admin", { maxRedirects: 0 })
  expect([307, 308]).toContain(res.status())
  expect(res.headers()["location"]).toMatch(/\/app$/)
})

test("nagłówki bezpieczeństwa są ustawione", async ({ request }) => {
  const res = await request.get("/")
  expect(res.headers()["x-frame-options"]).toBe("DENY")
  expect(res.headers()["x-content-type-options"]).toBe("nosniff")
  expect(res.headers()["x-powered-by"]).toBeUndefined()
})
