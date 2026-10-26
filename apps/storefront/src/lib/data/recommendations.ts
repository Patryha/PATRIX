import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { sdk } from "../medusa"
import { listCatalog, type ProductSummary } from "./products"

type Ids = { bought_together: string[]; similar: string[] }

async function getRecommendationIds(productIds: string[]): Promise<Ids> {
  "use cache"
  cacheLife("minutes")
  cacheTag("products")
  return sdk.client
    .fetch<Ids>("/store/patrix/recommendations", { query: { product_ids: productIds.join(",") } })
    .catch(() => ({ bought_together: [], similar: [] }))
}

/** Karty w kolejności rekomendacji; dostępne przed niedostępnymi (kolejność wewnątrz grup bez zmian). */
function pick(ids: string[], cards: Map<string, ProductSummary>, limit: number) {
  const found = ids.flatMap((id) => (cards.has(id) ? [cards.get(id)!] : []))
  return [...found.filter((p) => p.inStock), ...found.filter((p) => !p.inStock)].slice(0, limit)
}

export async function getRecommendations(productIds: string[], limit = 4): Promise<{ boughtTogether: ProductSummary[]; similar: ProductSummary[] }> {
  if (!productIds.length) {
    return { boughtTogether: [], similar: [] }
  }
  const ids = await getRecommendationIds([...new Set(productIds)].sort())
  const all = [...new Set([...ids.bought_together, ...ids.similar])]
  const cards = new Map((await listCatalog({ ids: all })).map((p) => [p.id, p]))
  const boughtTogether = pick(ids.bought_together, cards, limit)
  const shown = new Set(boughtTogether.map((p) => p.id))
  return { boughtTogether, similar: pick(ids.similar.filter((id) => !shown.has(id)), cards, limit) }
}
