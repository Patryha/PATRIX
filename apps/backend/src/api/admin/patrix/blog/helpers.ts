import { MedusaError } from "@medusajs/framework/utils"
import type { PatrixCmsService } from "../../../../modules/patrix-cms"
import type { SaveBlogPostBody } from "../validators"

type Existing = { id: string; slug: string; published_at: Date | string | null } | null

/** Dane wpisu do zapisu: unikalny adres, adres stały po pierwszej publikacji, data pierwszej publikacji. */
export async function prepareBlogPost(cms: PatrixCmsService, body: SaveBlogPostBody, actor: string | null, existing: Existing = null) {
  if (existing?.published_at && existing.slug !== body.slug) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Adresu opublikowanego wpisu nie można zmienić (linki i wyszukiwarki prowadzą pod stary adres). Utwórz nowy wpis albo przekierowanie."
    )
  }
  const [taken] = await cms.listBlogPosts({ slug: body.slug }, { select: ["id"], take: 1 })
  if (taken && taken.id !== existing?.id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Adres „${body.slug}” ma już inny wpis.`)
  }
  return {
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt,
    body: body.body,
    cover_url: body.cover_url || null,
    cover_alt: body.cover_url ? (body.cover_alt ?? null) : null,
    product_handles: [...new Set(body.product_handles)] as unknown as Record<string, unknown>,
    seo_title: body.seo_title || null,
    seo_description: body.seo_description || null,
    status: body.status,
    published_at: existing?.published_at ? new Date(existing.published_at) : body.status === "published" ? new Date() : null,
    updated_by: actor,
  }
}
