import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { matchNames, readSearchQuery, searchCatalog } from "../../../../../lib/search-index"

/** Podpowiedzi podczas pisania: do 6 produktów, 3 marek i 3 kategorii (bez zapisu do statystyk). */
export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const q = readSearchQuery(req.query.q)
  const result = await searchCatalog(req.scope, q, { limit: 6, salesChannelIds: req.publishable_key_context?.sales_channel_ids })
  const products = result.partial ? [] : result.hits.flatMap((h) => {
    const card = result.catalog.products.get(h.id)
    return card ? [{ id: card.id, title: card.title, handle: card.handle, thumbnail: card.thumbnail, brand: card.brand }] : []
  })
  res.setHeader("Cache-Control", "public, max-age=60")
  res.json({
    products,
    brands: matchNames(result.catalog.brands, q, 3),
    categories: matchNames(result.catalog.categories, q, 3),
    suggestion: result.suggestion,
  })
}
