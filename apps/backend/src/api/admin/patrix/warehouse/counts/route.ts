import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../../../../../modules/patrix-warehouse"
import type { CreateStockCountBody } from "../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const warehouse = req.scope.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const counts = await warehouse.listStockCounts({}, { take: 100, order: { created_at: "DESC" } })
  res.json({ counts })
}

/** Otwiera spis lokalizacji: pozycje to wszystkie towary ze stanem w tej lokalizacji (stan z chwili otwarcia). */
export async function POST(req: AuthenticatedMedusaRequest<CreateStockCountBody>, res: MedusaResponse) {
  const warehouse = req.scope.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const { location_id, note } = req.validatedBody
  await req.scope.resolve(Modules.STOCK_LOCATION).retrieveStockLocation(location_id)
  if ((await warehouse.listStockCounts({ location_id, status: "open" }, { take: 1 })).length) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "W tej lokalizacji trwa już inwentaryzacja. Zakończ ją albo anuluj.")
  }
  const levels = await req.scope.resolve(Modules.INVENTORY).listInventoryLevels({ location_id }, { take: 5000 })
  const count = await warehouse.createStockCounts({ location_id, note: note ?? null, opened_by: req.auth_context.actor_id })
  if (levels.length) {
    await warehouse.createStockCountLines(levels.map((l) => ({ count_id: count.id, inventory_item_id: l.inventory_item_id, expected: Number(l.stocked_quantity) })))
  }
  res.status(201).json({ count, lines: levels.length })
}
