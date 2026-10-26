import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { invalidateSearchIndex } from "../../../../../lib/search-index"
import { PATRIX_SEARCH_MODULE, type PatrixSearchService } from "../../../../../modules/patrix-search"
import type { SaveSynonymBody } from "../../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const searchModule = req.scope.resolve<PatrixSearchService>(PATRIX_SEARCH_MODULE)
  const synonyms = await searchModule.listSearchSynonyms({}, { order: { created_at: "DESC" }, take: 5000 })
  res.json({ synonyms })
}

export async function POST(req: AuthenticatedMedusaRequest<SaveSynonymBody>, res: MedusaResponse) {
  const searchModule = req.scope.resolve<PatrixSearchService>(PATRIX_SEARCH_MODULE)
  const synonym = await searchModule.createSearchSynonyms({ terms: req.validatedBody.terms as unknown as Record<string, unknown>, note: req.validatedBody.note ?? null })
  invalidateSearchIndex()
  res.status(201).json({ synonym })
}
