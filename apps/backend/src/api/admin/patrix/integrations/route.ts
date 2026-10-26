import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listIntegrations } from "../../../../integrations/manifest"
import { productionAllowed } from "../../../../lib/integrations"
import { PATRIX_INTEGRATIONS_MODULE, type PatrixIntegrationsService } from "../../../../modules/patrix-integrations"

/** Lista integracji z manifestu i stan połączeń (bez sekretów: tylko podpowiedzi). */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const connections = await req.scope.resolve<PatrixIntegrationsService>(PATRIX_INTEGRATIONS_MODULE).listIntegrationConnections({}, { take: 200 })
  res.json({
    production_allowed: productionAllowed(),
    integrations: listIntegrations().map((entry) => {
      const connection = connections.find((c) => c.adapter === entry.id)
      return {
        id: entry.id,
        name: entry.name,
        category: entry.category,
        available: !!entry.adapter,
        fields: entry.adapter?.credentialFields ?? [],
        can_test: !!entry.adapter?.testConnection,
        webhook_path: entry.adapter?.verifyWebhook ? `/hooks/patrix/${entry.id}` : null,
        connection: connection
          ? {
              mode: connection.mode,
              enabled: connection.enabled,
              hints: connection.credential_hints ?? {},
              last_test_at: connection.last_test_at,
              last_test_ok: connection.last_test_ok,
              last_test_message: connection.last_test_message,
            }
          : null,
      }
    }),
  })
}
