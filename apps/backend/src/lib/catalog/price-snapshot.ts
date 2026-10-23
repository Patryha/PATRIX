import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, QueryContext } from "@medusajs/framework/utils"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService, type PricePoint } from "../../modules/patrix-catalog"

const PAGE = 200

type VariantRow = { id: string; calculated_price?: { calculated_amount?: number | null } | null }

/**
 * Zapisuje do historii aktualne ceny sprzedaży (z uwzględnieniem cenników promocyjnych) dla regionów PLN.
 * Wpis powstaje tylko przy zmianie ceny. Bez `productIds` przechodzi przez cały katalog.
 */
export async function snapshotPrices(container: MedusaContainer, productIds?: string[]): Promise<number> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = container.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const regions = await container.resolve(Modules.REGION).listRegions({ currency_code: "pln" }, { take: 1 })
  const region = regions[0]
  if (!region) {
    return 0
  }
  let recorded = 0
  for (let skip = 0; ; skip += PAGE) {
    const { data } = await query.graph({
      entity: "product_variant",
      fields: ["id", "calculated_price.calculated_amount"],
      filters: productIds ? { product_id: productIds } : {},
      pagination: { skip, take: PAGE },
      context: {
        calculated_price: QueryContext({ region_id: region.id, currency_code: "pln" }),
      },
    })
    const points: PricePoint[] = (data as VariantRow[])
      .filter((v) => typeof v.calculated_price?.calculated_amount === "number")
      .map((v) => ({ variant_id: v.id, currency_code: "pln", amount: Number(v.calculated_price!.calculated_amount) }))
    recorded += await catalog.recordPrices(points)
    if (data.length < PAGE) {
      break
    }
  }
  return recorded
}
