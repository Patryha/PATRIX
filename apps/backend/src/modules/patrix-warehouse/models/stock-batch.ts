import { model } from "@medusajs/framework/utils"

/**
 * Partia towaru w lokalizacji: numer partii i data ważności z dokumentu dostawy.
 * quantity to ilość pozostała w partii (zmniejszana przy wydaniu i sprzedaży według FEFO).
 */
const StockBatch = model
  .define("stock_batch", {
    id: model.id({ prefix: "batch" }).primaryKey(),
    inventory_item_id: model.text(),
    location_id: model.text(),
    lot_number: model.text().nullable(),
    expiry_date: model.dateTime().nullable(),
    quantity: model.number(),
    received_at: model.dateTime(),
  })
  .indexes([{ on: ["inventory_item_id", "location_id"] }, { on: ["expiry_date"] }])

export default StockBatch
