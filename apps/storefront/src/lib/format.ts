const priceFormatters = new Map<string, Intl.NumberFormat>()

/** Kwoty z Medusy v2 są w jednostkach głównych (np. 12.99 PLN). */
export function formatPrice(amount: number, currencyCode = "pln", locale = "pl-PL"): string {
  const key = `${locale}:${currencyCode}`
  let formatter = priceFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode.toUpperCase() })
    priceFormatters.set(key, formatter)
  }
  return formatter.format(amount)
}

export type UnitMeasure = { quantity: number; unit: "g" | "kg" | "ml" | "l" | "szt" | "pranie" }

const BASE: Record<UnitMeasure["unit"], { base: string; factor: number }> = {
  g: { base: "kg", factor: 1000 },
  kg: { base: "kg", factor: 1 },
  ml: { base: "l", factor: 1000 },
  l: { base: "l", factor: 1 },
  szt: { base: "szt.", factor: 1 },
  pranie: { base: "pranie", factor: 1 },
}

/**
 * Cena jednostkowa (za kg, l, szt. lub pranie) wymagana przy prezentacji ceny.
 * Zwraca null, gdy brak danych o ilości (nie zgadujemy).
 */
export function unitPrice(amount: number, measure: UnitMeasure | null | undefined, currencyCode = "pln") {
  if (!measure || !(measure.quantity > 0)) {
    return null
  }
  const { base, factor } = BASE[measure.unit]
  const perBase = (amount / measure.quantity) * factor
  return { value: perBase, label: `${formatPrice(perBase, currencyCode)} / ${base}` }
}

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" })

/** Data po polsku, np. „26 października 2026”. */
export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value))
}
