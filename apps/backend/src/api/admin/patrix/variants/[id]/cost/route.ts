import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../../../modules/patrix-catalog"
import type { SetVariantCostBody } from "../../../validators"

export async function POST(req: AuthenticatedMedusaRequest<SetVariantCostBody>, res: MedusaResponse) {
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  await req.scope.resolve(Modules.PRODUCT).retrieveProductVariant(req.params.id)
  const [current] = await catalog.listVariantCosts({ variant_id: req.params.id }, { take: 1 })
  const data = { purchase_price: req.validatedBody.purchase_price, supplier: req.validatedBody.supplier ?? null }
  const cost = current
    ? await catalog.updateVariantCosts({ id: current.id, ...data })
    : await catalog.createVariantCosts({ variant_id: req.params.id, currency_code: "pln", ...data })
  res.json({ cost })
}
