import { z } from "@medusajs/framework/zod"

export const CreateRoleSchema = z.object({
  handle: z.string().regex(/^[a-z][a-z0-9_]{2,40}$/, "Uchwyt: małe litery, cyfry i _"),
  name: z.string().min(2).max(80),
  description: z.string().max(300).nullish(),
  permissions: z.array(z.string()).min(1),
})
export type CreateRoleBody = z.infer<typeof CreateRoleSchema>

export const UpdateRoleSchema = CreateRoleSchema.omit({ handle: true }).partial().strict()
export type UpdateRoleBody = z.infer<typeof UpdateRoleSchema>

export const SetUserRolesSchema = z.object({ roles: z.array(z.string()).max(10) })
export type SetUserRolesBody = z.infer<typeof SetUserRolesSchema>

const optionalText = (max: number) => z.string().trim().max(max).nullish()
const handle = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Uchwyt: małe litery, cyfry i myślniki")

export const CreateBrandSchema = z.object({
  name: z.string().trim().min(1).max(120),
  handle,
  description: optionalText(2000),
  country_code: z.string().regex(/^[a-z]{2}$/).nullish(),
  website: z.string().url().nullish(),
  logo_url: z.string().url().nullish(),
})
export type CreateBrandBody = z.infer<typeof CreateBrandSchema>
export const UpdateBrandSchema = CreateBrandSchema.partial()
export type UpdateBrandBody = z.infer<typeof UpdateBrandSchema>

const stringList = z.array(z.string().trim().min(1).max(300)).max(60)
const nutritionValue = z.number().min(0).max(10000).nullish()

export const UpsertComplianceSchema = z
  .object({
    brand_id: z.string().nullish(),
    product_kind: z.enum(["general", "food", "household_chemical", "cosmetic"]),
    name_original: optionalText(300),
    manufacturer_name: optionalText(300),
    manufacturer_address: optionalText(600),
    manufacturer_contact: optionalText(300),
    manufacturer_in_eu: z.boolean(),
    eu_responsible_name: optionalText(300),
    eu_responsible_address: optionalText(600),
    country_of_origin: optionalText(100),
    net_quantity: z.number().positive().max(1_000_000).nullish(),
    net_quantity_unit: z.enum(["g", "kg", "ml", "l", "szt", "pranie"]).nullish(),
    ingredients: optionalText(10000),
    allergens: stringList.nullish(),
    allergens_confirmed: z.boolean(),
    nutrition: z
      .object({
        energy_kj: nutritionValue,
        energy_kcal: nutritionValue,
        fat: nutritionValue,
        saturates: nutritionValue,
        carbohydrate: nutritionValue,
        sugars: nutritionValue,
        protein: nutritionValue,
        salt: nutritionValue,
        basis: z.enum(["100g", "100ml"]).nullish(),
      })
      .nullish(),
    storage_conditions: optionalText(2000),
    usage_instructions: optionalText(5000),
    warnings: optionalText(5000),
    clp_signal_word: z.enum(["not_classified", "warning", "danger"]).nullish(),
    clp_hazard_statements: stringList.nullish(),
    clp_precautionary_statements: stringList.nullish(),
    clp_pictograms: z.array(z.enum(["GHS01", "GHS02", "GHS03", "GHS04", "GHS05", "GHS06", "GHS07", "GHS08", "GHS09"])).max(9).nullish(),
    ufi_code: z.string().trim().toUpperCase().regex(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/, "Format UFI: XXXX-XXXX-XXXX-XXXX").nullish(),
    cosmetic_pao_months: z.number().int().min(1).max(120).nullish(),
    cosmetic_function: optionalText(300),
    polish_label_verified: z.boolean(),
    internal_notes: optionalText(5000),
  })
  .strict()
export type UpsertComplianceBody = z.infer<typeof UpsertComplianceSchema>

export const ImportCsvSchema = z.object({ csv: z.string().min(1).max(2_000_000), dry_run: z.boolean().default(true) }).strict()
export type ImportCsvBody = z.infer<typeof ImportCsvSchema>

export const BulkProductsSchema = z
  .object({
    product_ids: z.array(z.string().min(1)).min(1).max(200),
    action: z.enum(["publish", "draft", "brand", "category_add", "category_remove"]),
    value: z.string().min(1).nullish(),
  })
  .strict()
  .refine((b) => b.action === "publish" || b.action === "draft" || b.action === "brand" || !!b.value, {
    message: "Wybierz kategorię.",
    path: ["value"],
  })
export type BulkProductsBody = z.infer<typeof BulkProductsSchema>

export const StockMovementSchema = z
  .object({
    type: z.enum(["receipt", "issue", "adjustment"]),
    inventory_item_id: z.string().min(1),
    location_id: z.string().min(1),
    quantity: z.number().int().min(-1_000_000).max(1_000_000).refine((q) => q !== 0, "Ilość nie może być zerem."),
    lot_number: optionalText(80),
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data ważności: RRRR-MM-DD").nullish(),
    batch_id: z.string().nullish(),
    reason: optionalText(300),
    document_ref: optionalText(120),
  })
  .strict()
  .refine((b) => b.type !== "adjustment" || !!b.reason, { message: "Podaj powód korekty.", path: ["reason"] })
export type StockMovementBody = z.infer<typeof StockMovementSchema>

export const CreateStockCountSchema = z.object({ location_id: z.string().min(1), note: optionalText(300) }).strict()
export type CreateStockCountBody = z.infer<typeof CreateStockCountSchema>

export const SaveCountLinesSchema = z
  .object({ lines: z.array(z.object({ id: z.string().min(1), counted: z.number().int().min(0).max(1_000_000).nullable() }).strict()).min(1).max(5000) })
  .strict()
export type SaveCountLinesBody = z.infer<typeof SaveCountLinesSchema>

export const StockTransferSchema = z
  .object({
    inventory_item_id: z.string().min(1),
    from_location_id: z.string().min(1),
    to_location_id: z.string().min(1),
    quantity: z.number().int().min(1).max(1_000_000),
    batch_id: z.string().nullish(),
    reason: optionalText(300),
    document_ref: optionalText(120),
  })
  .strict()
  .refine((t) => t.from_location_id !== t.to_location_id, { message: "Lokalizacja docelowa musi być inna niż źródłowa.", path: ["to_location_id"] })
export type StockTransferBody = z.infer<typeof StockTransferSchema>

export const SaveIntegrationSchema = z
  .object({
    credentials: z.record(z.string().regex(/^[a-z0-9_]{1,40}$/), z.string().max(4000)).optional(),
    mode: z.enum(["sandbox", "production"]).optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
export type SaveIntegrationBody = z.infer<typeof SaveIntegrationSchema>

export const SetVariantCostSchema = z.object({
  purchase_price: z.number().min(0).max(1_000_000),
  supplier: optionalText(200),
})
export type SetVariantCostBody = z.infer<typeof SetVariantCostSchema>

/** Treść strony sprawdza schemat sekcji w module CMS (jedno źródło prawdy). */
export const SaveDraftSchema = z.object({ content: z.unknown(), note: z.string().trim().max(300).nullish() }).strict()
export type SaveDraftBody = z.infer<typeof SaveDraftSchema>

/** Grupa synonimów: 2–20 określeń (pojedyncze słowa lub krótkie frazy), bez powtórzeń. */
export const SaveSynonymSchema = z
  .object({
    terms: z
      .array(z.string().trim().min(2).max(60))
      .min(2)
      .max(20)
      .refine((terms) => new Set(terms.map((t) => t.toLowerCase())).size === terms.length, "Określenia w grupie nie mogą się powtarzać."),
    note: optionalText(300),
  })
  .strict()
export type SaveSynonymBody = z.infer<typeof SaveSynonymSchema>

export const SaveRedirectSchema = z
  .object({
    from_path: z.string().trim().min(1).max(500),
    to_path: z.string().trim().min(1).max(500),
    permanent: z.boolean().default(true),
    note: optionalText(300),
  })
  .strict()
export type SaveRedirectBody = z.infer<typeof SaveRedirectSchema>
