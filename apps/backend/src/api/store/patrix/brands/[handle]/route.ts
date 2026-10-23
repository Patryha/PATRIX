import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../../modules/patrix-catalog"

/** Marka i identyfikatory jej produktów (do filtrowania listingu przez /store/products?id[]=...). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const [brand] = await catalog.listBrands({ handle: req.params.handle }, { take: 1 })
  if (!brand) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Nie znaleziono marki")
  }
  const rows = await catalog.listProductCompliances({ brand_id: brand.id }, { select: ["product_id"] })
  res.json({
    brand: { id: brand.id, name: brand.name, handle: brand.handle, description: brand.description, logo_url: brand.logo_url },
    product_ids: rows.map((r) => r.product_id),
  })
}
