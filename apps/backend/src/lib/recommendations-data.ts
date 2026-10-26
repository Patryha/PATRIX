import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../modules/patrix-catalog"
import { buildCoPurchase, type ProductFeatures } from "./recommendations"

/** Dane rekomendacji odświeżane co 10 minut (zamówienia z 180 dni, do 5000 zamówień). */
const TTL_MS = 10 * 60_000
const DAYS = 180
const MAX_ORDERS = 5000
const MAX_PRODUCTS = 20_000
const PAGE = 1000

type RecommendationData = {
  pairs: Map<string, Map<string, number>>
  features: Map<string, ProductFeatures>
  channels: Map<string, string[]>
  builtAt: number
}

let cached: RecommendationData | null = null
let building: Promise<RecommendationData> | null = null

export function invalidateRecommendations() {
  cached = null
}

export async function getRecommendationData(container: MedusaContainer) {
  if (cached && Date.now() - cached.builtAt < TTL_MS) {
    return cached
  }
  if (!building) {
    building = load(container)
      .then((data) => {
        cached = data
        return data
      })
      .finally(() => {
        building = null
      })
  }
  return building
}

type ProductGraph = {
  id: string
  created_at: string | Date
  type_id: string | null
  categories?: { id: string }[] | null
  tags?: { id: string }[] | null
  sales_channels?: { id: string }[] | null
}

async function load(container: MedusaContainer): Promise<RecommendationData> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = container.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "status", "items.product_id"],
    filters: { created_at: { $gte: new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000) } },
    pagination: { take: MAX_ORDERS, order: { created_at: "DESC" } },
  })
  const baskets = orders
    .filter((o) => o.status !== "canceled" && o.status !== "draft")
    .map((o) => (o.items ?? []).flatMap((i) => (i?.product_id ? [i.product_id] : [])))

  const products: ProductGraph[] = []
  for (let skip = 0; skip < MAX_PRODUCTS; skip += PAGE) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "created_at", "type_id", "categories.id", "tags.id", "sales_channels.id"],
      filters: { status: "published" },
      pagination: { skip, take: PAGE, order: { created_at: "DESC" } },
    })
    products.push(...(data as ProductGraph[]))
    if (data.length < PAGE) {
      break
    }
  }
  const compliances = await catalog.listProductCompliances({ brand_id: { $ne: null } }, { select: ["product_id", "brand_id"] })
  const brandOf = new Map(compliances.map((c) => [c.product_id, c.brand_id]))

  return {
    pairs: buildCoPurchase(baskets),
    features: new Map(
      products.map((p) => [
        p.id,
        {
          id: p.id,
          categories: (p.categories ?? []).map((c) => c.id),
          brand: brandOf.get(p.id) ?? null,
          type: p.type_id,
          tags: (p.tags ?? []).map((t) => t.id),
          created_at: new Date(p.created_at).getTime(),
        },
      ])
    ),
    channels: new Map(products.map((p) => [p.id, (p.sales_channels ?? []).map((s) => s.id)])),
    builtAt: Date.now(),
  }
}
