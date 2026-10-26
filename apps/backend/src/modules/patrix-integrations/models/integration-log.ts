import { model } from "@medusajs/framework/utils"

/** Dziennik wywołań integracji (bez sekretów i bez pełnych danych osobowych). */
const IntegrationLog = model
  .define("integration_log", {
    id: model.id({ prefix: "ilog" }).primaryKey(),
    adapter: model.text(),
    operation: model.text(),
    direction: model.enum(["outbound", "inbound"]),
    ok: model.boolean(),
    duration_ms: model.number().nullable(),
    message: model.text().nullable(),
    reference: model.text().nullable(),
  })
  .indexes([{ on: ["adapter", "created_at"] }, { on: ["created_at"] }])

export default IntegrationLog
