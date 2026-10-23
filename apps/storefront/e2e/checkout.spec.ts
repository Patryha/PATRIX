import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// Wymaga katalogu testowego (`npm run seed:test-catalog`): produkty [TEST], dostawa „[TEST] Kurier testowy”, kod TEST10.

async function addCookies(page: Page) {
  await page.goto("/produkt/test-ciastka-maslane")
  await page.getByLabel("Liczba sztuk").fill("2")
  await page.locator("#add-to-cart").getByRole("button", { name: "Dodaj do koszyka" }).click()
  await expect(page.getByText("Dodano do koszyka")).toBeVisible()
}

async function fillAddress(page: Page, opts: { invoice?: { company: string; nip: string } } = {}) {
  await page.getByLabel("E-mail").fill("klient@example.test")
  await page.getByLabel("Imię").fill("Jan")
  await page.getByLabel("Nazwisko").fill("Testowy")
  await page.getByLabel("Telefon").fill("600 700 800")
  await page.getByLabel("Ulica i numer").fill("Testowa 1")
  await page.getByLabel("Kod pocztowy").fill("00-001")
  await page.getByLabel("Miejscowość").fill("Warszawa")
  if (opts.invoice) {
    await page.getByLabel("Chcę otrzymać fakturę na firmę").check()
    await page.getByLabel("Nazwa firmy").fill(opts.invoice.company)
    await page.getByLabel("NIP").fill(opts.invoice.nip)
  }
  await page.getByRole("button", { name: "Zapisz i wybierz dostawę" }).click()
}

test.describe("koszyk i zamówienie", () => {
  test("koszyk: dodanie, zmiana ilości, kod rabatowy, licznik w nagłówku", async ({ page }) => {
    await addCookies(page)
    await expect(page.getByRole("link", { name: "Koszyk, produktów: 2" })).toBeVisible()
    await page.goto("/koszyk")
    await expect(page.getByRole("link", { name: "[TEST] Ciastka maślane" })).toBeVisible()
    await expect(page.getByText("18,98 zł").first()).toBeVisible()

    await page.getByLabel("Kod rabatowy").fill("NIEMA")
    await page.getByRole("button", { name: "Zastosuj" }).click()
    await expect(page.getByText(/nie istnieje|nieprawidłowy|nie można/i)).toBeVisible()
    await page.getByLabel("Kod rabatowy").fill("test10")
    await page.getByRole("button", { name: "Zastosuj" }).click()
    await expect(page.getByRole("list", { name: "Naliczone kody" })).toContainText("TEST10")
    await expect(page.getByRole("term").filter({ hasText: "Rabat" })).toBeVisible()

    const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()
    expect(a11y.violations).toEqual([])

    await page.getByRole("button", { name: "Usuń kod TEST10" }).click()
    await expect(page.getByRole("list", { name: "Naliczone kody" })).toHaveCount(0)
    await page.getByRole("button", { name: "Usuń z koszyka: [TEST] Ciastka maślane" }).click()
    await expect(page.getByText("Twój koszyk jest pusty.")).toBeVisible()
  })

  test("zamówienie jako gość z fakturą na firmę: walidacja, dostawa, pobranie, potwierdzenie", async ({ page }) => {
    await addCookies(page)
    await page.goto("/zamowienie")
    await page.getByRole("button", { name: "Zapisz i wybierz dostawę" }).click()
    await expect(page.getByText("Popraw zaznaczone pola.")).toBeVisible()

    await fillAddress(page, { invoice: { company: "[TEST] Firma", nip: "123-456-32-19" } })
    await expect(page.getByText("Podaj prawidłowy NIP (10 cyfr).")).toBeVisible()
    await page.getByLabel("NIP").fill("123-456-32-18")
    await page.getByRole("button", { name: "Zapisz i wybierz dostawę" }).click()

    await page.getByLabel(/\[TEST\] Kurier testowy/).check()
    await page.getByRole("button", { name: "Wybierz dostawę", exact: true }).click()
    await expect(page.locator("aside").getByText("12,99 zł")).toBeVisible()

    await page.getByLabel("Płatność przy odbiorze (pobranie)").check()
    await page.getByRole("button", { name: "Wybierz płatność" }).click()

    const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze()
    expect(a11y.violations).toEqual([])

    const submit = page.getByRole("button", { name: /Zamawiam z obowiązkiem zapłaty \(31,97\s*zł\)/ })
    await page.getByLabel(/Akceptuję/).check()
    await submit.click()

    await expect(page).toHaveURL(/\/zamowienie\/potwierdzenie$/)
    await expect(page.getByText(/Przyjęliśmy zamówienie nr \d+/)).toBeVisible()
    await expect(page.getByText("Faktura na firmę: [TEST] Firma, NIP 1234563218")).toBeVisible()
    await expect(page.getByText("Płatność: Płatność przy odbiorze (pobranie)")).toBeVisible()
    await expect(page.getByRole("link", { name: "Koszyk, pusty" })).toBeVisible()
  })

  test("pusty koszyk przekierowuje z /zamowienie, potwierdzenie bez ciasteczka nic nie ujawnia", async ({ page }) => {
    await page.goto("/zamowienie")
    await expect(page).toHaveURL(/\/koszyk$/)
    await page.goto("/zamowienie/potwierdzenie")
    await expect(page.getByText("Nie znaleziono zamówienia do wyświetlenia.", { exact: false })).toBeVisible()
  })
})
