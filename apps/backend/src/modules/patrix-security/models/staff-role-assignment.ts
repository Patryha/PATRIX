import { model } from "@medusajs/framework/utils"

/** Przypisanie roli do użytkownika panelu (moduł User Medusy). */
const StaffRoleAssignment = model
  .define("staff_role_assignment", {
    id: model.id({ prefix: "srasg" }).primaryKey(),
    user_id: model.text(),
    role_id: model.text(),
  })
  .indexes([
    { on: ["user_id", "role_id"], unique: true, where: "deleted_at IS NULL" },
    { on: ["user_id"] },
  ])

export default StaffRoleAssignment
