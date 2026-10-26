import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { getAdapter } from "../../../../../../integrations/manifest"
import { IntegrationError, testConnection } from "../../../../../../lib/integrations"

/** Test połączenia: prawdziwe wywołanie API operatora przez adapter; wynik zapisany i w dzienniku. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const adapter = getAdapter(req.params.adapter)
  if (!adapter?.testConnection) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Ta integracja nie ma testu połączenia.")
  }
  try {
    res.json(await testConnection(req.scope, adapter))
  } catch (e) {
    if (e instanceof IntegrationError) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, e.message)
    }
    throw e
  }
}
