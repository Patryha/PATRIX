import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test.describe("konto klienta", () => {
  test("rejestracja, przeniesienie koszyka, zamówienie w historii, wylogowanie", async ({ page }, info) => {
    const email = `klient-${Date.now()}-${info.project.name}@example.test`

    await page.goto("/produkt/test-ciastka-maslane")
    await page.locator("#add-to-cart").getByRole("button", { name: "Dodaj do koszyka" }).click()
    await expect(page.getByText("Dodano do koszyka")).toBeVisible()

    await page.goto("/rejestracja")
    const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()
    expect(a11y.violations).toEqual([])
    await page.getByLabel("E-mail").fill(email)
    await page.getByLabel("Imię").fill("Anna")
    await page.getByLabel("Nazwisko").fill("Testowa")
    await page.getByLabel("Hasło").fill("krotkie")
    await page.getByRole("button", { name: "Załóż konto" }).click()
    await expect(page.getByText("Hasło musi mieć co najmniej 10 znaków.")).toBeVisible()
    await expect(page.getByText("Zaakceptuj regulamin sklepu.")).toBeVisible()

    await page.getByLabel("Hasło").fill("bezpieczne-haslo-1")
    await page.getByLabel(/Akceptuję/).check()
    await page.getByRole("button", { name: "Załóż konto" }).click()
    await expect(page).toHaveURL(/\/konto$/)
    await expect(page.getByText(email)).toBeVisible()
    await expect(page.getByText("Nie masz jeszcze zamówień.")).toBeVisible()
    // Koszyk gościa przeszedł na konto
    await expect(page.getByRole("link", { name: "Koszyk, produktów: 1" })).toBeVisible()

    // Zamówienie jako zalogowany klient: e-mail z konta jest już w formularzu
    await page.goto("/zamowienie")
    await expect(page.getByLabel("E-mail")).toHaveValue(email)
    await page.getByLabel("Imię").fill("Anna")
    await page.getByLabel("Nazwisko").fill("Testowa")
    await page.getByLabel("Telefon").fill("+48 600 700 800")
    await page.getByLabel("Ulica i numer").fill("Testowa 2")
    await page.getByLabel("Kod pocztowy").fill("30-001")
    await page.getByLabel("Miejscowość").fill("Kraków")
    await page.getByRole("button", { name: "Zapisz i wybierz dostawę" }).click()
    await page.getByLabel(/\[TEST\] Kurier testowy/).check()
    await page.getByRole("button", { name: "Wybierz dostawę", exact: true }).click()
    await page.getByLabel("Płatność przy odbiorze (pobranie)").check()
    await page.getByRole("button", { name: "Wybierz płatność" }).click()
    await page.getByLabel(/Akceptuję/).check()
    await page.getByRole("button", { name: /Zamawiam z obowiązkiem zapłaty/ }).click()
    await expect(page.getByText(/Przyjęliśmy zamówienie nr (\d+)/)).toBeVisible()
    const number = (await page.getByText(/Przyjęliśmy zamówienie nr/).textContent())?.match(/nr (\d+)/)?.[1]

    await page.goto("/konto")
    await expect(page.getByRole("table", { name: "Historia zamówień" }).getByRole("cell", { name: number, exact: true })).toBeVisible()

    await page.getByRole("button", { name: "Wyloguj się" }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto("/konto")
    await expect(page).toHaveURL(/\/logowanie\?next=\/konto$/)

    // Logowanie: złe hasło, potem poprawne
    await page.getByLabel("E-mail").fill(email)
    await page.getByLabel("Hasło").fill("zle-haslo-123")
    await page.getByRole("button", { name: "Zaloguj się" }).click()
    await expect(page.getByText("Nieprawidłowy e-mail lub hasło.")).toBeVisible()
    await page.getByLabel("Hasło").fill("bezpieczne-haslo-1")
    await page.getByRole("button", { name: "Zaloguj się" }).click()
    await expect(page).toHaveURL(/\/konto$/)
    await expect(page.getByRole("cell", { name: number, exact: true })).toBeVisible()
  })

  test("logowanie nie przekierowuje poza sklep", async ({ page }) => {
    // Nieistniejące konto: sprawdzamy, że po błędzie zostajemy w sklepie (adres powrotu jest i tak filtrowany na serwerze).
    await page.goto("/logowanie?next=//evil.example")
    await page.getByLabel("E-mail").fill("nikt@example.test")
    await page.getByLabel("Hasło").fill("dowolne-haslo-1")
    await page.getByRole("button", { name: "Zaloguj się" }).click()
    await expect(page.getByText("Nieprawidłowy e-mail lub hasło.")).toBeVisible()
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/logowanie/)
  })
})
