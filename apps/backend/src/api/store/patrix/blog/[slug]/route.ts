import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PATRIX_CMS_MODULE, type PatrixCmsService } from "../../../../../modules/patrix-cms"

/** Opublikowany wpis po adresie; szkic i nieistniejący wpis dają 404. */
export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const cms = req.scope.resolve<PatrixCmsService>(PATRIX_CMS_MODULE)
  const [post] = await cms.listBlogPosts(
    { slug: req.params.slug, status: "published" },
    {
      select: ["slug", "title", "excerpt", "body", "cover_url", "cover_alt", "product_handles", "seo_title", "seo_description", "published_at", "updated_at"],
      take: 1,
    }
  )
  if (!post) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Nie znaleziono wpisu")
  }
  res.json({ post })
}
