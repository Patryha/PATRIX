import { model } from "@medusajs/framework/utils"

/** Niezmienialny dziennik operacji administracyjnych i zdarzeń bezpieczeństwa. */
const AuditLog = model
  .define("audit_log", {
    id: model.id({ prefix: "audit" }).primaryKey(),
    actor_type: model.text(),
    actor_id: model.text().nullable(),
    action: model.text(),
    method: model.text().nullable(),
    path: model.text().nullable(),
    status_code: model.number().nullable(),
    ip: model.text().nullable(),
    user_agent: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([{ on: ["actor_id"] }, { on: ["action"] }, { on: ["created_at"] }])

export default AuditLog
