import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_CMS_MODULE, type PatrixCmsService } from "../../../../modules/patrix-cms"

const MAX_LIMIT = 50

const intParam = (value: unknown, fallback: number, max: number) => {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : NaN
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback
}

/** Opublikowane wpisy, najnowsze najpierw (bez treści, tylko dane do listy). */
export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const cms = req.scope.resolve<PatrixCmsService>(PATRIX_CMS_MODULE)
  const limit = intParam(req.query.limit, 12, MAX_LIMIT) || 12
  const offset = intParam(req.query.offset, 0, 100_000)
  const [posts, count] = await cms.listAndCountBlogPosts(
    { status: "published" },
    {
      select: ["slug", "title", "excerpt", "cover_url", "cover_alt", "published_at", "updated_at"],
      order: { published_at: "DESC" },
      take: limit,
      skip: offset,
    }
  )
  res.json({ posts, count, limit, offset })
}
