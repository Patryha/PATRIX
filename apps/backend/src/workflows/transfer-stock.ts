import { MedusaError } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { allocateFefo } from "../lib/warehouse"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../modules/patrix-warehouse"
import { applyInventoryDeltaStep } from "./record-stock-movement"

export type TransferInput = {
  inventory_item_id: string
  from_location_id: string
  to_location_id: string
  quantity: number
  batch_id?: string | null
  reason?: string | null
  document_ref?: string | null
  actor_id?: string | null
}

/** Partie przechodzą do lokalizacji docelowej z tym samym numerem i datą ważności (FEFO działa dalej). */
const moveBatchesStep = createStep(
  "patrix-transfer-batches",
  async (input: TransferInput, { container }) => {
    const warehouse = container.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
    const batches = await warehouse.listStockBatches({ inventory_item_id: input.inventory_item_id, location_id: input.from_location_id })
    let allocation
    if (input.batch_id) {
      const batch = batches.find((b) => b.id === input.batch_id)
      if (!batch) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "Wybrana partia nie należy do tego towaru i lokalizacji.")
      }
      if (batch.quantity < input.quantity) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `W partii zostało ${batch.quantity} szt.`)
      }
      allocation = { allocations: [{ batch_id: batch.id, quantity: input.quantity }], untracked: 0 }
    } else {
      allocation = allocateFefo(batches, input.quantity)
    }

    const base = {
      inventory_item_id: input.inventory_item_id,
      type: "transfer" as const,
      reason: input.reason ?? null,
      document_ref: input.document_ref ?? null,
      actor_id: input.actor_id ?? null,
    }
    const batchUpdates: { id: string; previous: number }[] = []
    const createdBatchIds: string[] = []
    const rows: (typeof base & { location_id: string; quantity: number; batch_id: string | null })[] = []
    for (const a of allocation.allocations) {
      const source = batches.find((b) => b.id === a.batch_id)!
      batchUpdates.push({ id: source.id, previous: source.quantity })
      await warehouse.updateStockBatches({ id: source.id, quantity: source.quantity - a.quantity })
      const target = await warehouse.createStockBatches({
        inventory_item_id: input.inventory_item_id,
        location_id: input.to_location_id,
        lot_number: source.lot_number,
        expiry_date: source.expiry_date,
        quantity: a.quantity,
        received_at: source.received_at,
      })
      createdBatchIds.push(target.id)
      rows.push({ ...base, location_id: input.from_location_id, quantity: -a.quantity, batch_id: source.id })
      rows.push({ ...base, location_id: input.to_location_id, quantity: a.quantity, batch_id: target.id })
    }
    if (allocation.untracked > 0) {
      rows.push({ ...base, location_id: input.from_location_id, quantity: -allocation.untracked, batch_id: null })
      rows.push({ ...base, location_id: input.to_location_id, quantity: allocation.untracked, batch_id: null })
    }
    const movements = await warehouse.createStockMovements(rows)
    return new StepResponse(movements, { movementIds: movements.map((m) => m.id), batchUpdates, createdBatchIds })
  },
  async (undo, { container }) => {
    if (!undo) {
      return
    }
    const warehouse = container.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
    await warehouse.deleteStockMovements(undo.movementIds)
    for (const b of undo.batchUpdates) {
      await warehouse.updateStockBatches({ id: b.id, quantity: b.previous })
    }
    if (undo.createdBatchIds.length) {
      await warehouse.deleteStockBatches(undo.createdBatchIds)
    }
  }
)

/** Przesunięcie między magazynami (MM): rozchód w źródle, przyjęcie w celu i partie razem albo wcale. */
export const transferStockWorkflow = createWorkflow("patrix-transfer-stock", (input: TransferInput) => {
  const deltas = transform({ input }, ({ input }) => ({
    out: { inventory_item_id: input.inventory_item_id, location_id: input.from_location_id, delta: -input.quantity, type: "issue" as const },
    in: { inventory_item_id: input.inventory_item_id, location_id: input.to_location_id, delta: input.quantity, type: "receipt" as const },
  }))
  applyInventoryDeltaStep(deltas.out)
  applyInventoryDeltaStep(deltas.in).config({ name: "patrix-apply-inventory-delta-target" })
  return new WorkflowResponse(moveBatchesStep(input))
})
