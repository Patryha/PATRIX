import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../../../../../../../modules/patrix-warehouse"

/** Anulowanie spisu bez zmian w stanach. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const warehouse = req.scope.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const count = await warehouse.retrieveStockCount(req.params.id)
  if (count.status !== "open") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Spis jest już zamknięty.")
  }
  res.json({ count: await warehouse.updateStockCounts({ id: count.id, status: "canceled", closed_by: req.auth_context.actor_id, closed_at: new Date() }) })
}
