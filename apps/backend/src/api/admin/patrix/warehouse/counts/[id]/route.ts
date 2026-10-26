import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../../../../../../modules/patrix-warehouse"

/** Spis z pozycjami: stan przy otwarciu, stan bieżący, policzona ilość i różnica względem stanu bieżącego. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const warehouse = req.scope.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const count = await warehouse.retrieveStockCount(req.params.id)
  const lines = await warehouse.listStockCountLines({ count_id: count.id }, { take: 5000 })
  const itemIds = lines.map((l) => l.inventory_item_id)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const [{ data: items }, levels, location] = await Promise.all([
    itemIds.length ? query.graph({ entity: "inventory_item", fields: ["id", "sku", "title"], filters: { id: itemIds } }) : { data: [] },
    req.scope.resolve(Modules.INVENTORY).listInventoryLevels({ location_id: count.location_id, inventory_item_id: itemIds }, { take: 5000 }),
    req.scope.resolve(Modules.STOCK_LOCATION).retrieveStockLocation(count.location_id),
  ])
  const rows = lines
    .map((l) => {
      const item = (items as { id: string; sku: string | null; title: string | null }[]).find((i) => i.id === l.inventory_item_id)
      const current = Number(levels.find((x) => x.inventory_item_id === l.inventory_item_id)?.stocked_quantity ?? 0)
      return { ...l, sku: item?.sku ?? null, title: item?.title ?? null, current, difference: l.counted === null ? null : l.counted - current }
    })
    .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "pl"))
  res.json({ count: { ...count, location: location.name }, lines: rows })
}
