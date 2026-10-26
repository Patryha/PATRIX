import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_INTEGRATIONS_MODULE, type PatrixIntegrationsService } from "../../../../../modules/patrix-integrations"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
  const skip = Math.max(Number(req.query.offset) || 0, 0)
  const filters: Record<string, unknown> = {}
  if (typeof req.query.adapter === "string" && req.query.adapter) {
    filters.adapter = req.query.adapter
  }
  if (req.query.ok === "false") {
    filters.ok = false
  }
  const [logs, count] = await req.scope
    .resolve<PatrixIntegrationsService>(PATRIX_INTEGRATIONS_MODULE)
    .listAndCountIntegrationLogs(filters, { take, skip, order: { created_at: "DESC" } })
  res.json({ logs, count, limit: take, offset: skip })
}
