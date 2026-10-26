import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../modules/patrix-warehouse"
import { fefoOrder } from "./warehouse"

type ReturnGraph = {
  id: string
  order_id: string
  location_id: string | null
  items?: {
    id: string
    received_quantity: number | string | null
    damaged_quantity: number | string | null
    item?: { variant?: { manage_inventory?: boolean; inventory_items?: { inventory_item_id: string; required_quantity: number }[] } | null } | null
  }[]
}

const sameLot = (a: { lot_number: string | null; expiry_date: Date | string | null }, b: { lot_number: string | null; expiry_date: Date | string | null }) =>
  a.lot_number === b.lot_number && (a.expiry_date ? new Date(a.expiry_date).getTime() : null) === (b.expiry_date ? new Date(b.expiry_date).getTime() : null)

/**
 * Przyjęty zwrot klienta: Medusa zwiększa stan o sztuki nieuszkodzone; tutaj zapisujemy ruch „return” i oddajemy
 * ilość do partii, z których towar był sprzedany w tym zamówieniu (najpierw najkrótsza data ważności, żeby nie
 * zawyżać terminu). Bez informacji o partii ilość trafia poza partie. Idempotentne: dopisujemy tylko różnicę
 * względem ilości już zapisanej dla pozycji zwrotu, więc kolejne częściowe przyjęcia dodają jedynie przyrost.
 */
export async function recordReturnRestock(container: MedusaContainer, returnId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const warehouse = container.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const { data } = await query.graph({
    entity: "return",
    fields: [
      "id",
      "order_id",
      "location_id",
      "items.id",
      "items.received_quantity",
      "items.damaged_quantity",
      "items.item.variant.manage_inventory",
      "items.item.variant.inventory_items.inventory_item_id",
      "items.item.variant.inventory_items.required_quantity",
    ],
    filters: { id: returnId },
  })
  const ret = data[0] as ReturnGraph | undefined
  if (!ret?.location_id) {
    return 0
  }
  const { data: orders } = await query.graph({ entity: "order", fields: ["id", "fulfillments.id"], filters: { id: ret.order_id } })
  const fulfillmentIds = ((orders[0] as { fulfillments?: { id: string }[] } | undefined)?.fulfillments ?? []).map((f) => f.id)

  let recorded = 0
  for (const line of ret.items ?? []) {
    const variant = line.item?.variant
    if (!variant?.manage_inventory) {
      continue
    }
    const restocked = Number(line.received_quantity ?? 0) - Number(line.damaged_quantity ?? 0)
    for (const link of variant.inventory_items ?? []) {
      const source_id = `zwrot:${ret.order_id}:${ret.id}:${line.id}:${link.inventory_item_id}`
      const done = (await warehouse.listStockMovements({ source_id }, { take: 1000 })).reduce((s, m) => s + m.quantity, 0)
      const quantity = restocked * Number(link.required_quantity) - done
      if (quantity <= 0) {
        continue
      }
      const rows = await restoreToSoldBatches(warehouse, {
        inventory_item_id: link.inventory_item_id,
        location_id: ret.location_id,
        order_id: ret.order_id,
        fulfillment_ids: fulfillmentIds,
        quantity,
      })
      await warehouse.createStockMovements(rows.map((r) => ({ ...r, type: "return" as const, source_id, reason: "Zwrot klienta" })))
      recorded += 1
    }
  }
  return recorded
}

async function restoreToSoldBatches(
  warehouse: PatrixWarehouseService,
  input: { inventory_item_id: string; location_id: string; order_id: string; fulfillment_ids: string[]; quantity: number }
) {
  const movements = await warehouse.listStockMovements({ inventory_item_id: input.inventory_item_id, type: ["sale", "return"] }, { take: 5000 })
  // Sprzedaż z przesyłek tego zamówienia, partia po partii (anulowania przesyłek mają dodatnią ilość i ją pomniejszają).
  const soldPerBatch = new Map<string, number>()
  for (const m of movements) {
    if (m.type === "sale" && m.batch_id && input.fulfillment_ids.some((f) => m.source_id?.startsWith(`${f}:`))) {
      soldPerBatch.set(m.batch_id, (soldPerBatch.get(m.batch_id) ?? 0) - m.quantity)
    }
  }
  const sold = soldPerBatch.size ? await warehouse.listStockBatches({ id: [...soldPerBatch.keys()] }) : []
  // Wcześniejsze zwroty z tego zamówienia (także do kopii partii w innej lokalizacji) zmniejszają ilość do oddania.
  const earlier = movements.filter((m) => m.type === "return" && m.batch_id && m.source_id?.startsWith(`zwrot:${input.order_id}:`))
  const earlierBatches = earlier.length ? await warehouse.listStockBatches({ id: [...new Set(earlier.map((m) => m.batch_id!))] }) : []
  for (const m of earlier) {
    const target = earlierBatches.find((b) => b.id === m.batch_id)
    const origin = sold.find((b) => b.id === m.batch_id || (target && sameLot(b, target)))
    if (origin) {
      soldPerBatch.set(origin.id, (soldPerBatch.get(origin.id) ?? 0) - m.quantity)
    }
  }

  let left = input.quantity
  const rows: { inventory_item_id: string; location_id: string; quantity: number; batch_id: string | null }[] = []
  for (const batch of fefoOrder(sold)) {
    const room = soldPerBatch.get(batch.id) ?? 0
    if (left <= 0 || room <= 0) {
      continue
    }
    const take = Math.min(room, left)
    let batchId = batch.id
    if (batch.location_id === input.location_id) {
      await warehouse.updateStockBatches({ id: batch.id, quantity: batch.quantity + take })
    } else {
      const copy = await warehouse.createStockBatches({
        inventory_item_id: input.inventory_item_id,
        location_id: input.location_id,
        lot_number: batch.lot_number,
        expiry_date: batch.expiry_date,
        quantity: take,
        received_at: batch.received_at,
      })
      batchId = copy.id
    }
    rows.push({ inventory_item_id: input.inventory_item_id, location_id: input.location_id, quantity: take, batch_id: batchId })
    left -= take
  }
  if (left > 0) {
    rows.push({ inventory_item_id: input.inventory_item_id, location_id: input.location_id, quantity: left, batch_id: null })
  }
  return rows
}
