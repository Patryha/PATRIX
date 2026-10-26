import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { sdk } from "../medusa"

export type BlogPostSummary = {
  slug: string
  title: string
  excerpt: string
  cover_url: string | null
  cover_alt: string | null
  published_at: string
  updated_at: string
}

export type BlogPost = BlogPostSummary & {
  body: string
  product_handles: string[]
  seo_title: string | null
  seo_description: string | null
}

export const BLOG_PAGE_SIZE = 12

/** Strona listy opublikowanych wpisów (najnowsze najpierw). */
export async function listBlogPosts(page = 1, limit = BLOG_PAGE_SIZE): Promise<{ posts: BlogPostSummary[]; count: number }> {
  "use cache"
  cacheLife("minutes")
  cacheTag("blog")
  return sdk.client.fetch<{ posts: BlogPostSummary[]; count: number }>("/store/patrix/blog", { query: { limit, offset: (page - 1) * limit } })
}

/** Opublikowany wpis albo null (szkic, brak wpisu). Inne błędy backendu nie są zapamiętywane jako „brak wpisu”. */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  "use cache"
  cacheLife("minutes")
  cacheTag("blog", `blog:${slug}`)
  return sdk.client
    .fetch<{ post: BlogPost }>(`/store/patrix/blog/${encodeURIComponent(slug)}`)
    .then((r) => r.post)
    .catch((e: { status?: number }) => {
      if (e?.status === 404) {
        return null
      }
      throw e
    })
}
