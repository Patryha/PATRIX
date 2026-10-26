import { expect, test } from "@playwright/test"

// Zestaw testowy: „[TEST] Zestaw: 2 × Krem do rąk” (inventory kit z seed:test-catalog).

test.describe("zestawy", () => {
  test("karta zestawu pokazuje składniki z linkami, strona główna ma sekcję Zestawy", async ({ page }) => {
    await page.goto("/produkt/test-zestaw-kremow")
    const contents = page.getByRole("region", { name: "W zestawie" })
    await expect(contents.getByRole("listitem")).toHaveCount(1)
    await expect(contents.getByRole("listitem")).toContainText("2 ×")
    await contents.getByRole("link", { name: "[TEST] Krem do rąk (75 ml)" }).click()
    await expect(page).toHaveURL(/\/produkt\/test-krem-do-rak$/)
    // Zwykły produkt nie ma sekcji składu
    await expect(page.getByRole("region", { name: "W zestawie" })).toHaveCount(0)

    await page.goto("/")
    const rail = page.getByRole("region", { name: "Zestawy" })
    await expect(rail.getByRole("link", { name: "[TEST] Zestaw: 2 × Krem do rąk" })).toBeVisible()
    await expect(rail.getByRole("link", { name: "[TEST] Ciastka maślane" })).toHaveCount(0)
  })
})
