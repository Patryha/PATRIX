import { model } from "@medusajs/framework/utils"

/** Historia cen sprzedaży (dyrektywa Omnibus: najniższa cena z 30 dni przed obniżką). */
const PriceHistoryEntry = model
  .define("price_history_entry", {
    id: model.id({ prefix: "phist" }).primaryKey(),
    variant_id: model.text(),
    currency_code: model.text(),
    amount: model.bigNumber(),
    recorded_at: model.dateTime(),
  })
  .indexes([{ on: ["variant_id", "currency_code", "recorded_at"] }])

export default PriceHistoryEntry
