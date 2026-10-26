import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../modules/patrix-warehouse"
import { allocateFefo } from "./warehouse"

/**
 * Sprzedaż w dzienniku magazynu. Stan zmniejsza Medusa przy utworzeniu przesyłki; tutaj zdejmujemy
 * ilość z partii według FEFO i zapisujemy ruch „sale”. Idempotentne: source_id = przesyłka:pozycja.
 */
export async function recordFulfillmentSales(container: MedusaContainer, fulfillmentId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const warehouse = container.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const { data } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "location_id", "items.id", "items.inventory_item_id", "items.quantity"],
    filters: { id: fulfillmentId },
  })
  const fulfillment = data[0]
  if (!fulfillment?.location_id) {
    return 0
  }
  let recorded = 0
  for (const item of fulfillment.items ?? []) {
    if (!item?.inventory_item_id) {
      continue
    }
    const source_id = `${fulfillment.id}:${item.id}`
    if ((await warehouse.listStockMovements({ source_id }, { take: 1 })).length) {
      continue
    }
    const quantity = Number(item.quantity)
    const batches = await warehouse.listStockBatches({ inventory_item_id: item.inventory_item_id, location_id: fulfillment.location_id })
    const { allocations, untracked } = allocateFefo(batches, quantity)
    for (const a of allocations) {
      const batch = batches.find((b) => b.id === a.batch_id)!
      await warehouse.updateStockBatches({ id: batch.id, quantity: batch.quantity - a.quantity })
    }
    const base = { inventory_item_id: item.inventory_item_id, location_id: fulfillment.location_id, type: "sale" as const, source_id, reason: "Wysyłka zamówienia" }
    await warehouse.createStockMovements([
      ...allocations.map((a) => ({ ...base, quantity: -a.quantity, batch_id: a.batch_id })),
      ...(untracked > 0 ? [{ ...base, quantity: -untracked, batch_id: null }] : []),
    ])
    recorded += 1
  }
  return recorded
}

/** Anulowanie przesyłki: Medusa przywraca stan, a my zwracamy ilości do tych samych partii. */
export async function reverseFulfillmentSales(container: MedusaContainer, fulfillmentId: string) {
  const warehouse = container.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const sales = (await warehouse.listStockMovements({ type: "sale" }, { take: 1000, order: { created_at: "ASC" } })).filter(
    (m) => m.source_id?.startsWith(`${fulfillmentId}:`) && m.quantity < 0
  )
  let reversed = 0
  for (const sale of sales) {
    const source_id = `${sale.source_id}:anulowanie:${sale.id}`
    if ((await warehouse.listStockMovements({ source_id }, { take: 1 })).length) {
      continue
    }
    if (sale.batch_id) {
      const [batch] = await warehouse.listStockBatches({ id: sale.batch_id })
      if (batch) {
        await warehouse.updateStockBatches({ id: batch.id, quantity: batch.quantity - sale.quantity })
      }
    }
    await warehouse.createStockMovements({
      inventory_item_id: sale.inventory_item_id,
      location_id: sale.location_id,
      type: "sale",
      quantity: -sale.quantity,
      batch_id: sale.batch_id,
      source_id,
      reason: "Anulowanie przesyłki",
    })
    reversed += 1
  }
  return reversed
}
