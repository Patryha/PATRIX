import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../../../../modules/patrix-security"
import { permissionsOf } from "../../../../../modules/patrix-security/service"
import type { UpdateRoleBody } from "../../validators"

export async function POST(req: AuthenticatedMedusaRequest<UpdateRoleBody>, res: MedusaResponse) {
  const security = req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)
  const role = await security.updateCustomRole(req.params.id, req.validatedBody)
  await security.recordAudit({
    actor_type: "user",
    actor_id: req.auth_context.actor_id,
    action: "staff.role_updated",
    metadata: { role: role.handle, permissions: permissionsOf(role) },
  })
  res.json({ role: { ...role, permissions: permissionsOf(role) } })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const security = req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)
  const role = await security.deleteCustomRole(req.params.id)
  if (!role) {
    res.status(409).json({ code: "ROLE_IN_USE", message: "Rola jest przypisana pracownikom. Najpierw zmień ich role." })
    return
  }
  await security.recordAudit({ actor_type: "user", actor_id: req.auth_context.actor_id, action: "staff.role_deleted", metadata: { role: role.handle } })
  res.json({ id: role.id, deleted: true })
}
