import { model } from "@medusajs/framework/utils"

/** Inwentaryzacja (spis z natury) jednej lokalizacji: otwarta → zatwierdzona albo anulowana. */
const StockCount = model
  .define("stock_count", {
    id: model.id({ prefix: "scnt" }).primaryKey(),
    location_id: model.text(),
    status: model.enum(["open", "closed", "canceled"]).default("open"),
    note: model.text().nullable(),
    opened_by: model.text().nullable(),
    closed_by: model.text().nullable(),
    closed_at: model.dateTime().nullable(),
  })
  .indexes([{ on: ["location_id", "status"] }])

export default StockCount
