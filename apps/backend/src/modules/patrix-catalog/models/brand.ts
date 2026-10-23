import { model } from "@medusajs/framework/utils"

/** Marka produktu (strony marek, filtry, dane strukturalne). */
const Brand = model
  .define("brand", {
    id: model.id({ prefix: "brand" }).primaryKey(),
    name: model.text().searchable(),
    handle: model.text(),
    description: model.text().nullable(),
    country_code: model.text().nullable(),
    website: model.text().nullable(),
    logo_url: model.text().nullable(),
  })
  .indexes([{ on: ["handle"], unique: true, where: "deleted_at IS NULL" }])

export default Brand
