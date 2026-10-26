import { UpsertComplianceSchema } from "../../api/admin/patrix/validators"
import { normalizeHeader, parseDecimal, parseYesNo } from "../csv"

/**
 * Import danych produktów z CSV (kolumny po polsku). Pusta komórka = bez zmian.
 * Import nigdy nie potwierdza etykiety ani alergenów: zmienione dane wracają do weryfikacji.
 * Dane CLP i wartości odżywcze uzupełnia się na karcie produktu (zbyt złożone na jedną komórkę).
 */
type Parsed = { value: unknown } | { error: string }
type Column = { field: string; parse: (v: string) => Parsed }

const text = (field: string): Column => ({ field, parse: (v) => ({ value: v }) })
const KINDS: Record<string, string> = {
  ogolny: "general",
  general: "general",
  zywnosc: "food",
  food: "food",
  chemia: "household_chemical",
  household_chemical: "household_chemical",
  kosmetyk: "cosmetic",
  cosmetic: "cosmetic",
}

export const COMPLIANCE_COLUMNS: Record<string, Column> = {
  rodzaj: {
    field: "product_kind",
    parse: (v) => (KINDS[normalizeHeader(v)] ? { value: KINDS[normalizeHeader(v)] } : { error: "rodzaj: ogólny, żywność, chemia albo kosmetyk" }),
  },
  marka: { field: "brand_handle", parse: (v) => ({ value: v.toLowerCase() }) },
  nazwa_oryginalna: text("name_original"),
  producent: text("manufacturer_name"),
  adres_producenta: text("manufacturer_address"),
  kontakt_producenta: text("manufacturer_contact"),
  producent_w_ue: {
    field: "manufacturer_in_eu",
    parse: (v) => {
      const b = parseYesNo(v)
      return b === null ? { error: "producent_w_ue: tak albo nie" } : { value: b }
    },
  },
  podmiot_odpowiedzialny_ue: text("eu_responsible_name"),
  adres_podmiotu_ue: text("eu_responsible_address"),
  kraj_pochodzenia: text("country_of_origin"),
  ilosc_netto: {
    field: "net_quantity",
    parse: (v) => {
      const n = parseDecimal(v)
      return n === null || n <= 0 ? { error: "ilosc_netto: liczba większa od zera" } : { value: n }
    },
  },
  jednostka: { field: "net_quantity_unit", parse: (v) => ({ value: v.toLowerCase() }) },
  sklad: text("ingredients"),
  alergeny: {
    field: "allergens",
    parse: (v) => ({
      value: v
        .split("|")
        .map((a) => a.trim())
        .filter(Boolean),
    }),
  },
  przechowywanie: text("storage_conditions"),
  sposob_uzycia: text("usage_instructions"),
  ostrzezenia: text("warnings"),
  ufi: text("ufi_code"),
  pao_miesiace: {
    field: "cosmetic_pao_months",
    parse: (v) => (/^\d{1,3}$/.test(v) ? { value: Number(v) } : { error: "pao_miesiace: liczba całkowita" }),
  },
  funkcja_kosmetyku: text("cosmetic_function"),
}

export const COMPLIANCE_KEY = "uchwyt"
export const COST_COLUMNS = ["sku", "cena_zakupu", "dostawca"] as const

/** Kolumny, których import nie zna (literówki w nagłówkach). */
export function unknownColumns(headers: string[], known: string[]) {
  return headers.filter((h) => h && !known.includes(h))
}

export type ComplianceRow = { handle: string; brand_handle?: string; changes: Record<string, unknown>; errors: string[] }

export function parseComplianceRow(row: Record<string, string>): ComplianceRow {
  const errors: string[] = []
  const changes: Record<string, unknown> = {}
  let brand_handle: string | undefined
  const handle = (row[COMPLIANCE_KEY] ?? "").toLowerCase()
  if (!handle) {
    errors.push("brak uchwytu produktu (kolumna uchwyt)")
  }
  for (const [column, def] of Object.entries(COMPLIANCE_COLUMNS)) {
    const raw = row[column]
    if (raw === undefined || raw === "") {
      continue
    }
    const parsed = def.parse(raw)
    if ("error" in parsed) {
      errors.push(parsed.error)
    } else if (def.field === "brand_handle") {
      brand_handle = parsed.value as string
    } else {
      changes[def.field] = parsed.value
    }
  }
  return { handle, brand_handle, changes, errors }
}

const SCHEMA_KEYS = Object.keys(UpsertComplianceSchema.shape)
const DEFAULTS = { product_kind: "general", manufacturer_in_eu: true, allergens_confirmed: false, polish_label_verified: false }

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/**
 * Łączy istniejące dane z importem. Zmiana czegokolwiek cofa potwierdzenie etykiety,
 * zmiana alergenów cofa ich potwierdzenie. Zwraca dane do zapisu albo błędy walidacji.
 */
export function mergeCompliance(existing: Record<string, unknown> | null, changes: Record<string, unknown>) {
  const base: Record<string, unknown> = { ...DEFAULTS }
  for (const key of SCHEMA_KEYS) {
    if (existing && existing[key] !== undefined && existing[key] !== null) {
      base[key] = existing[key]
    }
  }
  const changed = Object.keys(changes).filter((k) => !same(base[k], changes[k]))
  const next = { ...base, ...changes }
  // Marka nie jest daną z etykiety: jej zmiana nie wymaga ponownej weryfikacji.
  const labelChanged = changed.filter((k) => k !== "brand_id")
  if (labelChanged.length) {
    next.polish_label_verified = false
  }
  if (changed.includes("allergens")) {
    next.allergens_confirmed = false
  }
  const result = UpsertComplianceSchema.safeParse(next)
  if (!result.success) {
    return { changed, labelChanged, errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), data: null }
  }
  return { changed, labelChanged, errors: [] as string[], data: result.data }
}

export type CostRow = { sku: string; purchase_price: number | null; supplier: string | null; errors: string[] }

export function parseCostRow(row: Record<string, string>): CostRow {
  const errors: string[] = []
  const sku = row.sku ?? ""
  if (!sku) {
    errors.push("brak SKU")
  }
  const price = parseDecimal(row.cena_zakupu ?? "")
  if (price === null || price < 0 || price > 1_000_000) {
    errors.push("cena_zakupu: kwota netto w zł, np. 12,50")
  }
  const supplier = row.dostawca ? row.dostawca.slice(0, 200) : null
  return { sku, purchase_price: price === null ? null : Math.round(price * 100) / 100, supplier, errors }
}
