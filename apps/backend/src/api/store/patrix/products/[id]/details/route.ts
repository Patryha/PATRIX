import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { toPublicCompliance } from "../../../../../../lib/catalog/public-compliance"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../../../modules/patrix-catalog"

/**
 * Dane prawne i informacja Omnibus dla opublikowanego produktu.
 * `lowest_price_30d` to najniższa cena z 30 dni przed wprowadzeniem obecnej ceny.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "status", "variants.id"],
    filters: { id: req.params.id, status: "published" },
  })
  const product = data[0]
  if (!product) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Nie znaleziono produktu")
  }
  const compliance = await catalog.getComplianceByProduct(product.id)
  const brand = compliance?.brand_id ? await catalog.listBrands({ id: compliance.brand_id }) : []

  const omnibus = await Promise.all(
    (product.variants ?? []).map(async (v: { id: string }) => {
      const [current] = await catalog.listPriceHistoryEntries(
        { variant_id: v.id, currency_code: "pln" },
        { order: { recorded_at: "DESC" }, take: 1 }
      )
      const lowest = current
        ? await catalog.lowestPriceInWindow(v.id, "pln", new Date(current.recorded_at))
        : null
      return { variant_id: v.id, current_since: current?.recorded_at ?? null, lowest_price_30d: lowest }
    })
  )

  res.json({
    compliance: toPublicCompliance(compliance as unknown as Record<string, unknown> | null),
    brand: brand[0] ? { id: brand[0].id, name: brand[0].name, handle: brand[0].handle } : null,
    omnibus,
  })
}
