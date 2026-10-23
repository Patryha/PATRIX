import { model } from "@medusajs/framework/utils"

/** Rola pracownika z listą uprawnień "zasób:operacja". */
const StaffRole = model
  .define("staff_role", {
    id: model.id({ prefix: "srole" }).primaryKey(),
    handle: model.text(),
    name: model.text(),
    description: model.text().nullable(),
    permissions: model.json(),
    is_system: model.boolean().default(false),
  })
  .indexes([{ on: ["handle"], unique: true, where: "deleted_at IS NULL" }])

export default StaffRole
