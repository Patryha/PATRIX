import { z } from "@medusajs/framework/zod"

export const CreateRoleSchema = z.object({
  handle: z.string().regex(/^[a-z][a-z0-9_]{2,40}$/, "Uchwyt: małe litery, cyfry i _"),
  name: z.string().min(2).max(80),
  description: z.string().max(300).nullish(),
  permissions: z.array(z.string()).min(1),
})
export type CreateRoleBody = z.infer<typeof CreateRoleSchema>

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

export const SetVariantCostSchema = z.object({
  purchase_price: z.number().min(0).max(1_000_000),
  supplier: optionalText(200),
})
export type SetVariantCostBody = z.infer<typeof SetVariantCostSchema>
