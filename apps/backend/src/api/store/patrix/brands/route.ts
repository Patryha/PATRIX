import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../modules/patrix-catalog"

/** Marki z identyfikatorami przypisanych produktów (filtry listingu; status publikacji sprawdza /store/products). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const [brands, links] = await Promise.all([
    catalog.listBrands({}, { order: { name: "ASC" }, select: ["id", "name", "handle", "country_code", "logo_url"] }),
    catalog.listProductCompliances({ brand_id: { $ne: null } }, { select: ["product_id", "brand_id"] }),
  ])
  res.json({
    brands: brands.map((b) => ({ ...b, product_ids: links.filter((l) => l.brand_id === b.id).map((l) => l.product_id) })),
  })
}
