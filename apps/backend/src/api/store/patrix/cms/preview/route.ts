import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_CMS_MODULE, type PatrixCmsService } from "../../../../../modules/patrix-cms"

/** Szkic strony dla ważnego tokenu podglądu (link wygenerowany w panelu). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  const token = typeof req.query.token === "string" ? req.query.token : ""
  const draft = await req.scope.resolve<PatrixCmsService>(PATRIX_CMS_MODULE).getByPreviewToken(token)
  if (!draft) {
    return res.status(404).json({ message: "Link podglądu jest nieprawidłowy lub wygasł" })
  }
  res.json({ page: { page_key: draft.page_key, version: draft.version, content: draft.content, expires_at: draft.preview_expires_at } })
}
