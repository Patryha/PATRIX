import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { readSearchQuery, searchCatalog } from "../../../../../lib/search-index"

/** Podgląd wyników dla pracownika (wszystkie kanały sprzedaży, z punktacją), np. po dodaniu synonimu. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const q = readSearchQuery(req.query.q)
  const result = await searchCatalog(req.scope, q, { limit: 20 })
  res.json({
    partial: result.partial,
    suggestion: result.suggestion,
    hits: result.hits.map((h) => {
      const card = result.catalog.products.get(h.id)
      return { id: h.id, score: h.score, title: card?.title ?? h.id, brand: card?.brand ?? null }
    }),
  })
}
