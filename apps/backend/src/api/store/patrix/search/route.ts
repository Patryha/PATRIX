import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { readSearchQuery, recordSearchTerm, searchCatalog } from "../../../../lib/search-index"

/**
 * Wyszukiwanie produktów: identyfikatory w kolejności trafności, informacja o wynikach częściowych i poprawka frazy.
 * Ceny i dostępność sklep pobiera z /store/products (ta sama zasada co w bestsellerach).
 */
export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const q = readSearchQuery(req.query.q)
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500)
  const result = await searchCatalog(req.scope, q, { limit, salesChannelIds: req.publishable_key_context?.sales_channel_ids })
  await recordSearchTerm(req.scope, q, result.partial ? 0 : result.hits.length)
  res.json({
    product_ids: result.hits.map((h) => h.id),
    partial: result.partial,
    suggestion: result.suggestion,
  })
}
