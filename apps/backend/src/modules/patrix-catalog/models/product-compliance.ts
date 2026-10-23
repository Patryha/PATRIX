import { model } from "@medusajs/framework/utils"

/**
 * Dane produktu wymagane prawem i do prezentacji w PATRIX (GPSR, 1169/2011, CLP, 1223/2009, ceny jednostkowe).
 * Wypełniane wyłącznie na podstawie zweryfikowanych źródeł (etykieta PL, karta charakterystyki, producent).
 */
const ProductCompliance = model
  .define("product_compliance", {
    id: model.id({ prefix: "pcmp" }).primaryKey(),
    product_id: model.text(),
    brand_id: model.text().nullable(),
    product_kind: model.enum(["general", "food", "household_chemical", "cosmetic"]).default("general"),
    name_original: model.text().nullable(),

    // GPSR: producent i podmiot odpowiedzialny w UE
    manufacturer_name: model.text().nullable(),
    manufacturer_address: model.text().nullable(),
    manufacturer_contact: model.text().nullable(),
    manufacturer_in_eu: model.boolean().default(true),
    eu_responsible_name: model.text().nullable(),
    eu_responsible_address: model.text().nullable(),
    country_of_origin: model.text().nullable(),

    // Ilość netto i cena jednostkowa
    net_quantity: model.float().nullable(),
    net_quantity_unit: model.enum(["g", "kg", "ml", "l", "szt", "pranie"]).nullable(),

    // Treści etykiety (w języku polskim)
    ingredients: model.text().nullable(),
    allergens: model.json().nullable(),
    allergens_confirmed: model.boolean().default(false),
    nutrition: model.json().nullable(),
    storage_conditions: model.text().nullable(),
    usage_instructions: model.text().nullable(),
    warnings: model.text().nullable(),

    // CLP (chemia)
    clp_signal_word: model.enum(["not_classified", "warning", "danger"]).nullable(),
    clp_hazard_statements: model.json().nullable(),
    clp_precautionary_statements: model.json().nullable(),
    clp_pictograms: model.json().nullable(),
    ufi_code: model.text().nullable(),

    // Kosmetyki
    cosmetic_pao_months: model.number().nullable(),
    cosmetic_function: model.text().nullable(),

    // Weryfikacja
    polish_label_verified: model.boolean().default(false),
    data_status: model.enum(["draft", "needs_review", "verified"]).default("draft"),
    reviewed_by: model.text().nullable(),
    reviewed_at: model.dateTime().nullable(),
    internal_notes: model.text().nullable(),
  })
  .indexes([
    { on: ["product_id"], unique: true, where: "deleted_at IS NULL" },
    { on: ["brand_id"] },
  ])

export default ProductCompliance
