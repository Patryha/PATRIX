import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../../../modules/patrix-security"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const security = req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)
  const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200)
  const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0)
  const filters: Record<string, string> = {}
  for (const key of ["actor_id", "action"] as const) {
    if (typeof req.query[key] === "string") {
      filters[key] = req.query[key] as string
    }
  }
  const [audit_logs, count] = await security.listAndCountAuditLogs(filters, {
    take: limit,
    skip: offset,
    order: { created_at: "DESC" },
  })
  res.json({ audit_logs, count, limit, offset })
}
