import { model } from "@medusajs/framework/utils"

/** Cena zakupu wariantu: dane poufne, dostępne tylko z uprawnieniem finance. */
const VariantCost = model
  .define("variant_cost", {
    id: model.id({ prefix: "vcost" }).primaryKey(),
    variant_id: model.text(),
    purchase_price: model.bigNumber(),
    currency_code: model.text().default("pln"),
    supplier: model.text().nullable(),
  })
  .indexes([{ on: ["variant_id"], unique: true, where: "deleted_at IS NULL" }])

export default VariantCost
