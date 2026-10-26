import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../../../modules/patrix-security"

/** Pracownicy z rolami (do zarządzania rolami w panelu). */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const users = await req.scope.resolve(Modules.USER).listUsers({}, { select: ["id", "email", "first_name", "last_name"], order: { email: "ASC" }, take: 500 })
  const roles = await req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).getRolesByUser(users.map((u) => u.id))
  res.json({ users: users.map((u) => ({ ...u, roles: roles.get(u.id) ?? [] })) })
}
