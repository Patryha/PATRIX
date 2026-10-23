import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../../../../../modules/patrix-security"
import type { SetUserRolesBody } from "../../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const security = req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)
  const roles = await security.getUserRoles(req.params.id)
  res.json({ roles: roles.map((r) => ({ id: r.id, handle: r.handle, name: r.name })) })
}

export async function POST(req: AuthenticatedMedusaRequest<SetUserRolesBody>, res: MedusaResponse) {
  const userId = req.params.id
  await req.scope.resolve(Modules.USER).retrieveUser(userId)
  const security = req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)
  const { roles } = req.validatedBody

  const currentRoles = await security.getUserRoles(userId)
  const losesOwner = currentRoles.some((r) => r.handle === "owner") && !roles.includes("owner")
  if (losesOwner && (await security.countOwners()) <= 1) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Sklep musi mieć co najmniej jednego właściciela.")
  }
  const assigned = await security.setUserRoles(userId, roles)
  await security.recordAudit({
    actor_type: "user",
    actor_id: req.auth_context.actor_id,
    action: "staff.roles_changed",
    metadata: { user_id: userId, roles },
  })
  res.json({ roles: assigned.map((r) => ({ id: r.id, handle: r.handle, name: r.name })) })
}
