import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESOURCES } from "../../../../lib/permissions"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../../../modules/patrix-security"
import { permissionsOf } from "../../../../modules/patrix-security/service"
import type { CreateRoleBody } from "../validators"

function serialize(role: { id: string; handle: string; name: string; description: string | null; is_system: boolean; permissions: unknown }) {
  return { ...role, permissions: permissionsOf(role) }
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const security = req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)
  const roles = await security.listStaffRoles({}, { order: { name: "ASC" } })
  res.json({ roles: roles.map(serialize), resources: RESOURCES })
}

export async function POST(req: AuthenticatedMedusaRequest<CreateRoleBody>, res: MedusaResponse) {
  const security = req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)
  const role = await security.createCustomRole(req.validatedBody)
  res.status(201).json({ role: serialize(role) })
}
