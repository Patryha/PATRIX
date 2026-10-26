import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { processWebhook } from "../../../../../../../lib/integrations"
import { PATRIX_INTEGRATIONS_MODULE, type PatrixIntegrationsService } from "../../../../../../../modules/patrix-integrations"

/** Ręczne ponowienie zdarzenia, które się nie powiodło (także po wyczerpaniu automatycznych prób). */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<PatrixIntegrationsService>(PATRIX_INTEGRATIONS_MODULE)
  const webhook = await svc.retrieveIntegrationWebhook(req.params.id)
  if (webhook.status !== "failed" && webhook.status !== "dead") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "To zdarzenie zostało już obsłużone.")
  }
  if (webhook.status === "dead") {
    // Po wyczerpaniu prób liczymy od nowa, żeby kolejny błąd znów zaplanował ponowienia.
    await svc.updateIntegrationWebhooks({ id: webhook.id, attempts: 0, status: "failed" })
  }
  res.json({ status: await processWebhook(req.scope, webhook.id) })
}
