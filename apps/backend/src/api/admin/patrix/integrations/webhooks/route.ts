import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_INTEGRATIONS_MODULE, WEBHOOK_STATUSES, type PatrixIntegrationsService } from "../../../../../modules/patrix-integrations"

/** Skrzynka webhooków (bez treści zdarzeń: ta zostaje w bazie do ponowień). */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
  const skip = Math.max(Number(req.query.offset) || 0, 0)
  const filters: Record<string, string> = {}
  if (typeof req.query.adapter === "string" && req.query.adapter) {
    filters.adapter = req.query.adapter
  }
  if (typeof req.query.status === "string" && (WEBHOOK_STATUSES as readonly string[]).includes(req.query.status)) {
    filters.status = req.query.status
  }
  const [webhooks, count] = await req.scope
    .resolve<PatrixIntegrationsService>(PATRIX_INTEGRATIONS_MODULE)
    .listAndCountIntegrationWebhooks(filters, {
      take,
      skip,
      order: { created_at: "DESC" },
      select: ["id", "adapter", "external_id", "event_type", "status", "attempts", "next_attempt_at", "last_error", "processed_at", "created_at"],
    })
  res.json({ webhooks, count, limit: take, offset: skip })
}
