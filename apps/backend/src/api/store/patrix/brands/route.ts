import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../modules/patrix-catalog"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const brands = await catalog.listBrands({}, { order: { name: "ASC" }, select: ["id", "name", "handle", "country_code", "logo_url"] })
  res.json({ brands })
}
