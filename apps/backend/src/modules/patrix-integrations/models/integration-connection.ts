import { model } from "@medusajs/framework/utils"

/** Połączenie z adapterem: dane dostępowe tylko zaszyfrowane (AES-256-GCM), do panelu trafiają wyłącznie podpowiedzi. */
const IntegrationConnection = model
  .define("integration_connection", {
    id: model.id({ prefix: "intc" }).primaryKey(),
    adapter: model.text(),
    mode: model.enum(["sandbox", "production"]).default("sandbox"),
    enabled: model.boolean().default(false),
    credentials: model.text().nullable(),
    credential_hints: model.json().nullable(),
    last_test_at: model.dateTime().nullable(),
    last_test_ok: model.boolean().nullable(),
    last_test_message: model.text().nullable(),
  })
  .indexes([{ on: ["adapter"], unique: true, where: "deleted_at IS NULL" }])

export default IntegrationConnection
