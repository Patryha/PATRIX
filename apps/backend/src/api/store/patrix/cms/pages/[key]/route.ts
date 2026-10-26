import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PAGE_KEYS, PATRIX_CMS_MODULE, type PageKey, type PatrixCmsService } from "../../../../../../modules/patrix-cms"

/** Opublikowana wersja strony (sklep). 404, gdy strona nie ma jeszcze publikacji. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const key = req.params.key
  if (!(PAGE_KEYS as readonly string[]).includes(key)) {
    return res.status(404).json({ message: "Nieznana strona" })
  }
  const page = await req.scope.resolve<PatrixCmsService>(PATRIX_CMS_MODULE).getVersion(key as PageKey, "published")
  if (!page) {
    return res.status(404).json({ message: "Strona nie jest opublikowana" })
  }
  res.json({ page: { version: page.version, published_at: page.published_at, content: page.content } })
}
