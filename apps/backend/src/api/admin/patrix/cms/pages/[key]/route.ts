import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cmsOf, pageKeyOf } from "../../helpers"

/** Szkic, wersja opublikowana i historia wersji strony. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const key = pageKeyOf(req)
  const cms = cmsOf(req)
  const [draft, published, history] = await Promise.all([cms.getVersion(key, "draft"), cms.getVersion(key, "published"), cms.listHistory(key)])
  const strip = <T extends { preview_token_hash?: unknown } | null>(v: T) => (v ? { ...v, preview_token_hash: undefined } : v)
  res.json({ draft: strip(draft), published: strip(published), history })
}
