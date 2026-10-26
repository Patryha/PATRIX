import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../../../../../modules/patrix-warehouse"
import { recordStockMovementWorkflow } from "../../../../../workflows/record-stock-movement"
import type { StockMovementBody } from "../../validators"

/** Dziennik ruchów, najnowsze pierwsze; filtry: towar, lokalizacja, rodzaj. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const warehouse = req.scope.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
  const skip = Math.max(Number(req.query.offset) || 0, 0)
  const filters: Record<string, string> = {}
  for (const key of ["inventory_item_id", "location_id", "type"] as const) {
    if (typeof req.query[key] === "string" && req.query[key]) {
      filters[key] = req.query[key] as string
    }
  }
  const [movements, count] = await warehouse.listAndCountStockMovements(filters, { take, skip, order: { created_at: "DESC" } })
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const itemIds = [...new Set(movements.map((m) => m.inventory_item_id))]
  const { data: items } = itemIds.length
    ? await query.graph({ entity: "inventory_item", fields: ["id", "sku", "title"], filters: { id: itemIds } })
    : { data: [] as { id: string; sku: string | null; title: string | null }[] }
  const batchIds = [...new Set(movements.flatMap((m) => (m.batch_id ? [m.batch_id] : [])))]
  const batches = batchIds.length ? await warehouse.listStockBatches({ id: batchIds }) : []
  res.json({
    movements: movements.map((m) => ({
      ...m,
      item: items.find((i: { id: string }) => i.id === m.inventory_item_id) ?? null,
      batch: batches.find((b) => b.id === m.batch_id) ?? null,
    })),
    count,
    limit: take,
    offset: skip,
  })
}

export async function POST(req: AuthenticatedMedusaRequest<StockMovementBody>, res: MedusaResponse) {
  const { result } = await recordStockMovementWorkflow(req.scope).run({ input: { ...req.validatedBody, actor_id: req.auth_context.actor_id } })
  res.status(201).json({ movements: result })
}
