import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../../modules/patrix-catalog"
import type { UpdateBrandBody } from "../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  res.json({ brand: await catalog.retrieveBrand(req.params.id) })
}

export async function POST(req: AuthenticatedMedusaRequest<UpdateBrandBody>, res: MedusaResponse) {
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  await catalog.retrieveBrand(req.params.id)
  const brand = await catalog.updateBrands({ id: req.params.id, ...req.validatedBody })
  res.json({ brand })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  await catalog.retrieveBrand(req.params.id)
  const inUse = await catalog.listProductCompliances({ brand_id: req.params.id }, { take: 1 })
  if (inUse.length) {
    res.status(409).json({ code: "BRAND_IN_USE", message: "Marka jest przypisana do produktów. Najpierw zmień markę tych produktów." })
    return
  }
  await catalog.softDeleteBrands(req.params.id)
  res.json({ id: req.params.id, object: "brand", deleted: true })
}
