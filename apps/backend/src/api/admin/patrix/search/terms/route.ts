import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_SEARCH_MODULE, type PatrixSearchService } from "../../../../../modules/patrix-search"

/** Najczęstsze frazy; z `zero=1` tylko te, które ostatnio nie dały wyników (do synonimów i uzupełnienia oferty). */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const searchModule = req.scope.resolve<PatrixSearchService>(PATRIX_SEARCH_MODULE)
  const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
  const filters = req.query.zero === "1" ? { last_results: 0 } : {}
  const terms = await searchModule.listSearchTermStats(filters, {
    order: { searches: "DESC", last_searched_at: "DESC" },
    take,
    select: ["id", "term", "searches", "zero_results", "last_results", "last_searched_at"],
  })
  res.json({ terms })
}
