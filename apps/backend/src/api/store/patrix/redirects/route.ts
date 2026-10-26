import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_SEO_MODULE, type PatrixSeoService } from "../../../../modules/patrix-seo"

/** Lista przekierowań dla sklepu (proxy Next.js trzyma ją w pamięci przez minutę). */
export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const seo = req.scope.resolve<PatrixSeoService>(PATRIX_SEO_MODULE)
  const redirects = await seo.listRedirects({}, { select: ["from_path", "to_path", "permanent"], take: 10_000 })
  res.setHeader("Cache-Control", "public, max-age=60")
  res.json({ redirects: redirects.map((r) => ({ from: r.from_path, to: r.to_path, permanent: r.permanent })) })
}
