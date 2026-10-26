import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { invalidateSearchIndex } from "../../../../../../lib/search-index"
import { PATRIX_SEARCH_MODULE, type PatrixSearchService } from "../../../../../../modules/patrix-search"
import type { SaveSynonymBody } from "../../../validators"

export async function POST(req: AuthenticatedMedusaRequest<SaveSynonymBody>, res: MedusaResponse) {
  const searchModule = req.scope.resolve<PatrixSearchService>(PATRIX_SEARCH_MODULE)
  await searchModule.retrieveSearchSynonym(req.params.id)
  const synonym = await searchModule.updateSearchSynonyms({ id: req.params.id, terms: req.validatedBody.terms as unknown as Record<string, unknown>, note: req.validatedBody.note ?? null })
  invalidateSearchIndex()
  res.json({ synonym })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const searchModule = req.scope.resolve<PatrixSearchService>(PATRIX_SEARCH_MODULE)
  await searchModule.retrieveSearchSynonym(req.params.id)
  await searchModule.deleteSearchSynonyms(req.params.id)
  invalidateSearchIndex()
  res.json({ id: req.params.id, object: "search_synonym", deleted: true })
}
