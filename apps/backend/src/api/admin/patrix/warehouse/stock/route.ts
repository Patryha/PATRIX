import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { expiryState, fefoOrder } from "../../../../../lib/warehouse"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../../../../../modules/patrix-warehouse"

/**
 * Stany magazynowe z partiami: dla każdej pary towar–lokalizacja stan, rezerwacje, dostępne,
 * ilość w partiach (reszta to towar bez ewidencji partii) i najbliższa data ważności.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const warehouse = req.scope.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const locationId = typeof req.query.location_id === "string" && req.query.location_id ? req.query.location_id : undefined
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : ""

  const [{ data: levels }, { data: locations }, batches] = await Promise.all([
    query.graph({
      entity: "inventory_level",
      fields: ["inventory_item_id", "location_id", "stocked_quantity", "reserved_quantity", "inventory_item.sku", "inventory_item.title"],
      filters: locationId ? { location_id: locationId } : {},
      pagination: { take: 5000 },
    }),
    query.graph({ entity: "stock_location", fields: ["id", "name"] }),
    warehouse.listStockBatches(locationId ? { location_id: locationId } : {}, { take: 20000 }),
  ])

  const now = new Date()
  const rows = levels
    .filter((l: any) => !q || `${l.inventory_item?.sku ?? ""} ${l.inventory_item?.title ?? ""}`.toLowerCase().includes(q))
    .map((l: any) => {
      const own = fefoOrder(batches.filter((b) => b.inventory_item_id === l.inventory_item_id && b.location_id === l.location_id && b.quantity > 0))
      const tracked = own.reduce((s, b) => s + b.quantity, 0)
      const stocked = Number(l.stocked_quantity)
      const reserved = Number(l.reserved_quantity)
      const nearest = own.find((b) => b.expiry_date)?.expiry_date ?? null
      return {
        inventory_item_id: l.inventory_item_id,
        sku: l.inventory_item?.sku ?? null,
        title: l.inventory_item?.title ?? null,
        location_id: l.location_id,
        location: locations.find((x: { id: string }) => x.id === l.location_id)?.name ?? l.location_id,
        stocked,
        reserved,
        available: stocked - reserved,
        tracked,
        untracked: stocked - tracked,
        nearest_expiry: nearest,
        expiry_state: expiryState(nearest, now),
        batches: own.map((b) => ({ id: b.id, lot_number: b.lot_number, expiry_date: b.expiry_date, quantity: b.quantity, state: expiryState(b.expiry_date, now) })),
      }
    })
    .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "pl"))

  res.json({ locations, stock: rows })
}
