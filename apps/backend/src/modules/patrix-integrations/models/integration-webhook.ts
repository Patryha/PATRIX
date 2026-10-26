import { model } from "@medusajs/framework/utils"

export const WEBHOOK_STATUSES = ["received", "processed", "failed", "dead", "ignored"] as const

/** Skrzynka webhooków: każde zdarzenie raz (adapter + identyfikator zewnętrzny), z ponowieniami przy błędzie. */
const IntegrationWebhook = model
  .define("integration_webhook", {
    id: model.id({ prefix: "iwh" }).primaryKey(),
    adapter: model.text(),
    external_id: model.text(),
    event_type: model.text().nullable(),
    payload: model.json().nullable(),
    status: model.enum([...WEBHOOK_STATUSES]).default("received"),
    attempts: model.number().default(0),
    next_attempt_at: model.dateTime().nullable(),
    last_error: model.text().nullable(),
    processed_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["adapter", "external_id"], unique: true, where: "deleted_at IS NULL" },
    { on: ["status", "next_attempt_at"] },
  ])

export default IntegrationWebhook
