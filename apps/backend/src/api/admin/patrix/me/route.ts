import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../../../modules/patrix-security"

/** Role i uprawnienia zalogowanego pracownika (do ukrywania funkcji w panelu). */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const security = req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)
  const userId = req.auth_context.actor_id
  const [roles, permissions] = await Promise.all([security.getUserRoles(userId), security.getUserPermissions(userId)])
  res.json({ roles: roles.map((r) => ({ handle: r.handle, name: r.name })), permissions })
}
