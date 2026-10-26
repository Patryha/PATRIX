import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { EXPIRY_WARNING_DAYS, expiryState, fefoOrder } from "../../../../../lib/warehouse"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../../../../../modules/patrix-warehouse"

/** Raport dat ważności: partie przeterminowane i kończące się w ciągu `days` dni (domyślnie 30), z ilością > 0. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const days = Math.min(Math.max(Number(req.query.days) || EXPIRY_WARNING_DAYS, 1), 365)
  const warehouse = req.scope.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const until = new Date(Date.now() + days * 86_400_000)
  const batches = await warehouse.listStockBatches({ expiry_date: { $lte: until }, quantity: { $gt: 0 } }, { take: 5000 })
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const itemIds = [...new Set(batches.map((b) => b.inventory_item_id))]
  const locationIds = [...new Set(batches.map((b) => b.location_id))]
  const [{ data: items }, { data: locations }] = await Promise.all([
    itemIds.length ? query.graph({ entity: "inventory_item", fields: ["id", "sku", "title"], filters: { id: itemIds } }) : { data: [] },
    locationIds.length ? query.graph({ entity: "stock_location", fields: ["id", "name"], filters: { id: locationIds } }) : { data: [] },
  ])
  const now = new Date()
  res.json({
    days,
    batches: fefoOrder(batches).map((b) => ({
      ...b,
      state: expiryState(b.expiry_date, now, days),
      item: (items as { id: string }[]).find((i) => i.id === b.inventory_item_id) ?? null,
      location: (locations as { id: string; name: string }[]).find((l) => l.id === b.location_id)?.name ?? b.location_id,
    })),
  })
}
