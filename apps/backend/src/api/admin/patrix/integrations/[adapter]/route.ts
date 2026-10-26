import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { getAdapter } from "../../../../../integrations/manifest"
import { IntegrationError, saveConnection } from "../../../../../lib/integrations"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../../../../modules/patrix-security"
import type { SaveIntegrationBody } from "../../validators"

/** Zapis danych dostępowych, trybu i włączenia. Odpowiedź nie zawiera sekretów. */
export async function POST(req: AuthenticatedMedusaRequest<SaveIntegrationBody>, res: MedusaResponse) {
  const adapter = getAdapter(req.params.adapter)
  if (!adapter) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Ta integracja nie ma jeszcze adaptera.")
  }
  let connection
  try {
    connection = await saveConnection(req.scope, adapter, req.validatedBody)
  } catch (e) {
    if (e instanceof IntegrationError) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, e.message)
    }
    throw e
  }
  await req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).recordAudit({
    actor_type: "user",
    actor_id: req.auth_context.actor_id,
    action: "integration.updated",
    // Tylko nazwy zmienionych pól, nigdy wartości.
    metadata: { adapter: adapter.id, fields: Object.keys(req.validatedBody.credentials ?? {}), mode: connection.mode, enabled: connection.enabled },
  })
  res.json({ connection: { mode: connection.mode, enabled: connection.enabled, hints: connection.credential_hints ?? {} } })
}
