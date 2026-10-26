import { model } from "@medusajs/framework/utils"

export const MOVEMENT_TYPES = ["receipt", "issue", "adjustment", "count", "sale", "transfer", "return"] as const

/** Dziennik ruchów magazynowych (tylko dopisywanie). Ilość ze znakiem: + przyjęcie, - rozchód. */
const StockMovement = model
  .define("stock_movement", {
    id: model.id({ prefix: "smov" }).primaryKey(),
    inventory_item_id: model.text(),
    location_id: model.text(),
    type: model.enum([...MOVEMENT_TYPES]),
    quantity: model.number(),
    batch_id: model.text().nullable(),
    reason: model.text().nullable(),
    document_ref: model.text().nullable(),
    actor_id: model.text().nullable(),
    source_id: model.text().nullable(),
  })
  .indexes([{ on: ["inventory_item_id", "location_id"] }, { on: ["created_at"] }, { on: ["source_id"] }])

export default StockMovement
