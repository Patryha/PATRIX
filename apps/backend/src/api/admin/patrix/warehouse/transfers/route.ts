import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { transferStockWorkflow } from "../../../../../workflows/transfer-stock"
import type { StockTransferBody } from "../../validators"

export async function POST(req: AuthenticatedMedusaRequest<StockTransferBody>, res: MedusaResponse) {
  // Nieistniejąca lokalizacja docelowa → 404, zanim cokolwiek zmienimy.
  await req.scope.resolve(Modules.STOCK_LOCATION).retrieveStockLocation(req.validatedBody.to_location_id)
  const { result } = await transferStockWorkflow(req.scope).run({ input: { ...req.validatedBody, actor_id: req.auth_context.actor_id } })
  res.status(201).json({ movements: result })
}
