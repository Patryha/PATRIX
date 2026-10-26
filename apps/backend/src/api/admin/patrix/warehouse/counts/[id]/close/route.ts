import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../../../../../../../modules/patrix-warehouse"
import { recordStockMovementWorkflow } from "../../../../../../../workflows/record-stock-movement"

/**
 * Zatwierdzenie spisu: dla każdej policzonej pozycji różnica względem stanu w chwili zatwierdzenia
 * jest księgowana ruchem „count”. Pozycja zaksięgowana nie jest księgowana ponownie (bezpieczne ponowienie).
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const warehouse = req.scope.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const inventory = req.scope.resolve(Modules.INVENTORY)
  const count = await warehouse.retrieveStockCount(req.params.id)
  if (count.status !== "open") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Spis jest już zamknięty.")
  }
  const lines = await warehouse.listStockCountLines({ count_id: count.id, applied: false }, { take: 5000 })
  const pending = lines.filter((l) => l.counted !== null)
  let adjusted = 0
  for (const line of pending) {
    const [level] = await inventory.listInventoryLevels({ inventory_item_id: line.inventory_item_id, location_id: count.location_id })
    const delta = line.counted! - Number(level?.stocked_quantity ?? 0)
    if (delta !== 0) {
      await recordStockMovementWorkflow(req.scope).run({
        input: {
          type: "count",
          inventory_item_id: line.inventory_item_id,
          location_id: count.location_id,
          quantity: delta,
          reason: "Inwentaryzacja",
          document_ref: `Spis ${count.id}`,
          actor_id: req.auth_context.actor_id,
        },
      })
      adjusted += 1
    }
    await warehouse.updateStockCountLines({ id: line.id, applied: true })
  }
  const closed = await warehouse.updateStockCounts({ id: count.id, status: "closed", closed_by: req.auth_context.actor_id, closed_at: new Date() })
  res.json({ count: closed, counted: pending.length, adjusted, not_counted: lines.length - pending.length })
}
