import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../../../modules/patrix-catalog"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const { data } = await query.graph({ entity: "product", fields: ["variants.id"], filters: { id: req.params.id } })
  const variantIds = (data[0]?.variants ?? []).map((v: { id: string }) => v.id)
  const entries = variantIds.length
    ? await catalog.listPriceHistoryEntries({ variant_id: variantIds }, { order: { recorded_at: "DESC" }, take: 500 })
    : []
  res.json({ entries })
}
