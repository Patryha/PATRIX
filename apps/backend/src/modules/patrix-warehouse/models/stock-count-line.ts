import { model } from "@medusajs/framework/utils"

/** Pozycja spisu: stan w chwili otwarcia (expected), policzona ilość i czy różnicę już zaksięgowano. */
const StockCountLine = model
  .define("stock_count_line", {
    id: model.id({ prefix: "scln" }).primaryKey(),
    count_id: model.text(),
    inventory_item_id: model.text(),
    expected: model.number(),
    counted: model.number().nullable(),
    applied: model.boolean().default(false),
  })
  .indexes([{ on: ["count_id"] }, { on: ["count_id", "inventory_item_id"], unique: true, where: "deleted_at IS NULL" }])

export default StockCountLine
