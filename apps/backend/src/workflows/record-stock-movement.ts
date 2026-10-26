import { MedusaError, Modules } from "@medusajs/framework/utils"
import { createStep, createWorkflow, StepResponse, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { allocateFefo, signedDelta, type MovementKind } from "../lib/warehouse"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../modules/patrix-warehouse"

export type StockMovementInput = {
  type: MovementKind
  inventory_item_id: string
  location_id: string
  quantity: number
  lot_number?: string | null
  expiry_date?: string | null
  batch_id?: string | null
  reason?: string | null
  document_ref?: string | null
  actor_id?: string | null
}

/** Krok 1: zmiana stanu w module magazynu Medusy (z kontrolą dostępnej ilości i cofnięciem przy błędzie). */
const applyInventoryDeltaStep = createStep(
  "patrix-apply-inventory-delta",
  async (input: { inventory_item_id: string; location_id: string; delta: number; type: MovementKind }, { container }) => {
    const inventory = container.resolve(Modules.INVENTORY)
    const [level] = await inventory.listInventoryLevels({ inventory_item_id: input.inventory_item_id, location_id: input.location_id })
    let createdLevelId: string | null = null
    if (!level) {
      if (input.delta < 0) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Ten towar nie ma stanu w wybranej lokalizacji.")
      }
      const created = await inventory.createInventoryLevels({ inventory_item_id: input.inventory_item_id, location_id: input.location_id, stocked_quantity: 0 })
      createdLevelId = created.id
    } else if (input.delta < 0 && input.type === "count") {
      // Spis z natury: stan fizyczny może być niższy niż rezerwacje, ale nie poniżej zera.
      if (Number(level.stocked_quantity) + input.delta < 0) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Stan po spisie nie może być ujemny.")
      }
    } else if (input.delta < 0) {
      const available = Number(level.stocked_quantity) - Number(level.reserved_quantity)
      if (available + input.delta < 0) {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Za mało dostępnego towaru: dostępne ${available} szt. (część może być zarezerwowana dla zamówień).`)
      }
    }
    await inventory.adjustInventory(input.inventory_item_id, input.location_id, input.delta)
    return new StepResponse(input.delta, { ...input, createdLevelId })
  },
  async (undo, { container }) => {
    if (!undo) {
      return
    }
    const inventory = container.resolve(Modules.INVENTORY)
    await inventory.adjustInventory(undo.inventory_item_id, undo.location_id, -undo.delta)
    if (undo.createdLevelId) {
      await inventory.deleteInventoryLevels(undo.createdLevelId)
    }
  }
)

type RecordInput = StockMovementInput & { delta: number }

/** Krok 2: partie (nowa przy przyjęciu, FEFO albo wskazana przy rozchodzie) i wpisy w dzienniku ruchów. */
const recordMovementStep = createStep(
  "patrix-record-stock-movement",
  async (input: RecordInput, { container }) => {
    const warehouse = container.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
    const base = {
      inventory_item_id: input.inventory_item_id,
      location_id: input.location_id,
      type: input.type,
      reason: input.reason ?? null,
      document_ref: input.document_ref ?? null,
      actor_id: input.actor_id ?? null,
    }
    const batchUpdates: { id: string; previous: number }[] = []
    let createdBatchId: string | null = null
    const rows: (typeof base & { quantity: number; batch_id: string | null })[] = []

    if (input.delta > 0) {
      const tracked = input.type === "receipt" || !!input.lot_number || !!input.expiry_date
      if (tracked) {
        const batch = await warehouse.createStockBatches({
          inventory_item_id: input.inventory_item_id,
          location_id: input.location_id,
          lot_number: input.lot_number ?? null,
          expiry_date: input.expiry_date ? new Date(input.expiry_date) : null,
          quantity: input.delta,
          received_at: new Date(),
        })
        createdBatchId = batch.id
      }
      rows.push({ ...base, quantity: input.delta, batch_id: createdBatchId })
    } else {
      const need = -input.delta
      const batches = await warehouse.listStockBatches({ inventory_item_id: input.inventory_item_id, location_id: input.location_id })
      let allocation
      if (input.batch_id) {
        const batch = batches.find((b) => b.id === input.batch_id)
        if (!batch) {
          throw new MedusaError(MedusaError.Types.NOT_FOUND, "Wybrana partia nie należy do tego towaru i lokalizacji.")
        }
        if (batch.quantity < need) {
          throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `W partii zostało ${batch.quantity} szt.`)
        }
        allocation = { allocations: [{ batch_id: batch.id, quantity: need }], untracked: 0 }
      } else {
        allocation = allocateFefo(batches, need)
      }
      for (const a of allocation.allocations) {
        const batch = batches.find((b) => b.id === a.batch_id)!
        batchUpdates.push({ id: batch.id, previous: batch.quantity })
        await warehouse.updateStockBatches({ id: batch.id, quantity: batch.quantity - a.quantity })
        rows.push({ ...base, quantity: -a.quantity, batch_id: batch.id })
      }
      if (allocation.untracked > 0) {
        rows.push({ ...base, quantity: -allocation.untracked, batch_id: null })
      }
    }

    const movements = await warehouse.createStockMovements(rows)
    return new StepResponse(movements, { movementIds: movements.map((m) => m.id), batchUpdates, createdBatchId })
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
    if (undo.createdBatchId) {
      await warehouse.deleteStockBatches(undo.createdBatchId)
    }
  }
)

const computeDeltaStep = createStep("patrix-stock-movement-delta", async (input: StockMovementInput) => {
  try {
    return new StepResponse(signedDelta(input.type, input.quantity))
  } catch (e) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, (e as Error).message)
  }
})

/** Przyjęcie, wydanie albo korekta: zmiana stanu i wpis w dzienniku razem albo wcale. */
export const recordStockMovementWorkflow = createWorkflow("patrix-record-stock-movement", (input: StockMovementInput) => {
  const delta = computeDeltaStep(input)
  applyInventoryDeltaStep({ inventory_item_id: input.inventory_item_id, location_id: input.location_id, delta, type: input.type })
  const recordInput = transform({ input, delta }, ({ input, delta }) => ({ ...input, delta }))
  const movements = recordMovementStep(recordInput)
  return new WorkflowResponse(movements)
})
