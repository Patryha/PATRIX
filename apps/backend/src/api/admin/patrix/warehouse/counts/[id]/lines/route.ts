import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../../../../../../../modules/patrix-warehouse"
import type { SaveCountLinesBody } from "../../../../validators"

/** Zapis policzonych ilości (można wielokrotnie, do zatwierdzenia spisu). null = jeszcze nie policzono. */
export async function POST(req: AuthenticatedMedusaRequest<SaveCountLinesBody>, res: MedusaResponse) {
  const warehouse = req.scope.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const count = await warehouse.retrieveStockCount(req.params.id)
  if (count.status !== "open") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Spis jest zamknięty.")
  }
  const existing = await warehouse.listStockCountLines({ count_id: count.id, id: req.validatedBody.lines.map((l) => l.id) })
  const unknown = req.validatedBody.lines.filter((l) => !existing.some((e) => e.id === l.id))
  if (unknown.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Pozycje nie należą do tego spisu.")
  }
  await warehouse.updateStockCountLines(req.validatedBody.lines.map((l) => ({ id: l.id, counted: l.counted })))
  res.json({ saved: req.validatedBody.lines.length })
}
