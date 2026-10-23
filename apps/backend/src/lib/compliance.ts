/**
 * Kontrola kompletności danych produktu przed publikacją.
 * Reguły odzwierciedlają minimalne wymagania informacyjne (GPSR, rozp. 1169/2011, CLP 1272/2008,
 * rozp. detergentowe 648/2004, rozp. kosmetyczne 1223/2009, ceny jednostkowe). Nie zastępują porady prawnej.
 */
export type ProductKind = "general" | "food" | "household_chemical" | "cosmetic"

export type ComplianceData = {
  product_kind?: ProductKind | null
  manufacturer_name?: string | null
  manufacturer_address?: string | null
  manufacturer_contact?: string | null
  manufacturer_in_eu?: boolean | null
  eu_responsible_name?: string | null
  eu_responsible_address?: string | null
  net_quantity?: number | null
  net_quantity_unit?: string | null
  ingredients?: string | null
  allergens_confirmed?: boolean | null
  nutrition?: Record<string, unknown> | null
  clp_signal_word?: "not_classified" | "warning" | "danger" | null
  clp_hazard_statements?: unknown
  clp_pictograms?: unknown
  ufi_code?: string | null
  cosmetic_pao_months?: number | null
  polish_label_verified?: boolean | null
  country_of_origin?: string | null
}

export type ProductFacts = {
  title?: string | null
  hasImage: boolean
  variants: { id: string; sku?: string | null; ean?: string | null; hasPrice: boolean }[]
}

export type Issue = { field: string; message: string }
export type CompletenessReport = { complete: boolean; missing: Issue[]; warnings: Issue[] }

export const NUTRITION_FIELDS = ["energy_kj", "energy_kcal", "fat", "saturates", "carbohydrate", "sugars", "protein", "salt"] as const

const filled = (v: unknown) => (typeof v === "string" ? v.trim().length > 0 : v !== null && v !== undefined)
const nonEmptyList = (v: unknown) => Array.isArray(v) && v.length > 0

/** Suma kontrolna GTIN (EAN-8/12/13/14). */
export function isValidGtin(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) {
    return false
  }
  const digits = code.split("").map(Number)
  const check = digits.pop()!
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

export const UFI_PATTERN = /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/

export function checkCompleteness(data: ComplianceData | null | undefined, facts: ProductFacts): CompletenessReport {
  const missing: Issue[] = []
  const warnings: Issue[] = []
  const d = data ?? {}
  const need = (cond: boolean, field: string, message: string) => {
    if (!cond) missing.push({ field, message })
  }
  const warn = (cond: boolean, field: string, message: string) => {
    if (!cond) warnings.push({ field, message })
  }
  const kind = d.product_kind ?? "general"

  // Dane sprzedażowe
  need(facts.hasImage, "images", "Dodaj co najmniej jedno zdjęcie produktu.")
  need(facts.variants.length > 0, "variants", "Produkt musi mieć co najmniej jeden wariant.")
  need(facts.variants.every((v) => v.hasPrice), "prices", "Każdy wariant musi mieć cenę w PLN.")
  need(facts.variants.every((v) => filled(v.sku)), "sku", "Każdy wariant musi mieć SKU.")
  for (const v of facts.variants) {
    if (filled(v.ean) && !isValidGtin(v.ean!)) {
      missing.push({ field: "ean", message: `Nieprawidłowy kod EAN/GTIN: ${v.ean}` })
    }
  }
  warn(facts.variants.every((v) => filled(v.ean)), "ean", "Zalecany kod EAN/GTIN dla każdego wariantu (wyszukiwarka, Merchant Center).")

  // GPSR (wszystkie produkty konsumenckie)
  need(filled(d.manufacturer_name), "manufacturer_name", "Podaj nazwę producenta (GPSR).")
  need(filled(d.manufacturer_address), "manufacturer_address", "Podaj adres pocztowy producenta (GPSR).")
  need(filled(d.manufacturer_contact), "manufacturer_contact", "Podaj adres elektroniczny lub stronę kontaktową producenta (GPSR).")
  if (d.manufacturer_in_eu === false || kind === "cosmetic") {
    need(filled(d.eu_responsible_name), "eu_responsible_name", "Podaj podmiot odpowiedzialny w UE.")
    need(filled(d.eu_responsible_address), "eu_responsible_address", "Podaj adres podmiotu odpowiedzialnego w UE.")
  }
  need(!!d.polish_label_verified, "polish_label_verified", "Potwierdź, że oznakowanie w języku polskim zostało zweryfikowane.")

  // Ilość netto / cena jednostkowa
  if (kind !== "general") {
    need(filled(d.net_quantity) && (d.net_quantity as number) > 0 && filled(d.net_quantity_unit), "net_quantity", "Podaj ilość netto i jednostkę (cena jednostkowa).")
  }

  if (kind === "food") {
    need(filled(d.ingredients), "ingredients", "Podaj wykaz składników (rozp. 1169/2011).")
    need(!!d.allergens_confirmed, "allergens", "Potwierdź alergeny (także gdy produkt ich nie zawiera).")
    const nutrition = (d.nutrition ?? {}) as Record<string, unknown>
    const missingNutrition = NUTRITION_FIELDS.filter((f) => typeof nutrition[f] !== "number")
    need(missingNutrition.length === 0, "nutrition", `Uzupełnij wartość odżywczą na 100 g/ml: ${missingNutrition.join(", ")}.`)
    warn(filled(d.country_of_origin), "country_of_origin", "Podaj kraj pochodzenia, jeśli jego brak mógłby wprowadzać w błąd.")
  }

  if (kind === "household_chemical") {
    need(filled(d.clp_signal_word), "clp_signal_word", "Określ klasyfikację CLP (także „nie klasyfikowany”).")
    if (d.clp_signal_word === "warning" || d.clp_signal_word === "danger") {
      need(nonEmptyList(d.clp_hazard_statements), "clp_hazard_statements", "Podaj zwroty H.")
      need(nonEmptyList(d.clp_pictograms), "clp_pictograms", "Wybierz piktogramy GHS.")
      need(filled(d.ufi_code) && UFI_PATTERN.test(d.ufi_code!), "ufi_code", "Podaj poprawny kod UFI (XXXX-XXXX-XXXX-XXXX).")
    }
    need(filled(d.ingredients), "ingredients", "Podaj skład (oznakowanie detergentów, rozp. 648/2004).")
  }

  if (kind === "cosmetic") {
    need(filled(d.ingredients), "ingredients", "Podaj skład INCI (rozp. 1223/2009).")
    warn(filled(d.cosmetic_pao_months), "cosmetic_pao_months", "Podaj okres po otwarciu (PAO) lub datę minimalnej trwałości.")
  }

  return { complete: missing.length === 0, missing, warnings }
}
