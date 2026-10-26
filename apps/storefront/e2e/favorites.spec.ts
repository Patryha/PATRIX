import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test.describe("ulubione", () => {
  test("gość dodaje produkt, ulubione przechodzą na konto i zostają po ponownym zalogowaniu", async ({ page }, info) => {
    const email = `ulubione-${Date.now()}-${info.project.name}@example.test`

    await page.goto("/ulubione")
    await expect(page.getByText("Nie masz jeszcze ulubionych produktów.")).toBeVisible()

    await page.goto("/produkt/test-ciastka-maslane")
    await page.getByRole("button", { name: "Dodaj do ulubionych" }).click()
    await expect(page.getByRole("button", { name: "W ulubionych" })).toBeVisible()
    await expect(page.getByRole("status").filter({ hasText: "Dodano do ulubionych." })).toBeVisible()
    await expect(page.getByRole("link", { name: "Ulubione, produktów: 1" })).toBeVisible()

    // Stan po przeładowaniu pochodzi z serwera
    await page.reload()
    await expect(page.getByRole("button", { name: "W ulubionych" })).toBeVisible()

    await page.goto("/ulubione")
    const list = page.getByRole("list", { name: "Ulubione produkty" })
    await expect(list.getByRole("link", { name: "[TEST] Ciastka maślane" })).toBeVisible()
    const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()
    expect(a11y.violations).toEqual([])

    // Rejestracja: ulubione gościa trafiają na konto
    await page.goto("/rejestracja")
    await page.getByLabel("E-mail").fill(email)
    await page.getByLabel("Imię").fill("Ula")
    await page.getByLabel("Nazwisko").fill("Testowa")
    await page.getByLabel("Hasło").fill("bezpieczne-haslo-1")
    await page.getByLabel(/Akceptuję/).check()
    await page.getByRole("button", { name: "Załóż konto" }).click()
    await expect(page).toHaveURL(/\/konto$/)
    await expect(page.getByRole("link", { name: "Ulubione, produktów: 1" })).toBeVisible()

    // Po wylogowaniu przeglądarka nie pokazuje ulubionych konta
    await page.getByRole("button", { name: "Wyloguj się" }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("banner").getByRole("link", { name: "Ulubione", exact: true })).toBeVisible()

    await page.goto("/logowanie?next=/ulubione")
    await page.getByLabel("E-mail").fill(email)
    await page.getByLabel("Hasło").fill("bezpieczne-haslo-1")
    await page.getByRole("button", { name: "Zaloguj się" }).click()
    await expect(page).toHaveURL(/\/ulubione$/)
    await expect(list.getByRole("link", { name: "[TEST] Ciastka maślane" })).toBeVisible()

    await list.getByRole("button", { name: "Usuń [TEST] Ciastka maślane z ulubionych" }).click()
    await expect(page.getByText("Nie masz jeszcze ulubionych produktów.")).toBeVisible()
    await expect(page.getByRole("banner").getByRole("link", { name: "Ulubione", exact: true })).toBeVisible()
  })
})
