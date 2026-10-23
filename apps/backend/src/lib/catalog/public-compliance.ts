/** Pola danych produktu bezpieczne do pokazania klientowi (bez notatek wewnętrznych i danych weryfikatora). */
export const PUBLIC_COMPLIANCE_FIELDS = [
  "product_kind",
  "name_original",
  "manufacturer_name",
  "manufacturer_address",
  "manufacturer_contact",
  "manufacturer_in_eu",
  "eu_responsible_name",
  "eu_responsible_address",
  "country_of_origin",
  "net_quantity",
  "net_quantity_unit",
  "ingredients",
  "allergens",
  "nutrition",
  "storage_conditions",
  "usage_instructions",
  "warnings",
  "clp_signal_word",
  "clp_hazard_statements",
  "clp_precautionary_statements",
  "clp_pictograms",
  "ufi_code",
  "cosmetic_pao_months",
  "cosmetic_function",
] as const

export function toPublicCompliance(row: Record<string, unknown> | null) {
  // Klient widzi wyłącznie dane potwierdzone z polską etykietą.
  if (!row || row.polish_label_verified !== true) {
    return null
  }
  return Object.fromEntries(PUBLIC_COMPLIANCE_FIELDS.map((f) => [f, row[f] ?? null]))
}
