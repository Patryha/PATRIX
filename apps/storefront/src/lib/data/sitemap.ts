import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { sdk } from "../medusa"
import { listBlogPosts } from "./blog"
import { listBrands } from "./products"
import { getDefaultRegion } from "./regions"

export type SitemapEntry = { path: string; lastModified?: string }

const PAGE = 500
/** Limit adresów w jednym pliku sitemap według protokołu. */
const MAX_URLS = 50_000

/** Adresy do indeksowania: opublikowane produkty, kategorie i marki z produktami (bez stron `noindex`). */
export async function listSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("products", "categories", "brands", "blog")
  const region = await getDefaultRegion()
  const products: SitemapEntry[] = []
  for (let offset = 0; offset < MAX_URLS; offset += PAGE) {
    const { products: page, count } = await sdk.store.product.list({ fields: "handle,updated_at", limit: PAGE, offset, region_id: region?.id })
    products.push(...page.map((p) => ({ path: `/produkt/${p.handle}`, lastModified: p.updated_at ? new Date(p.updated_at).toISOString() : undefined })))
    if (offset + PAGE >= count) {
      break
    }
  }
  const { product_categories } = await sdk.store.category.list({ fields: "handle,updated_at", limit: 1000 })
  const brands = await listBrands()
  const posts: SitemapEntry[] = []
  for (let page = 1; posts.length < MAX_URLS; page++) {
    const { posts: batch, count } = await listBlogPosts(page, 50).catch(() => ({ posts: [], count: 0 }))
    posts.push(...batch.map((p) => ({ path: `/blog/${p.slug}`, lastModified: new Date(p.updated_at).toISOString() })))
    if (page * 50 >= count) {
      break
    }
  }
  return [
    { path: "/" },
    ...product_categories.map((c) => ({ path: `/kategoria/${c.handle}`, lastModified: c.updated_at ? new Date(c.updated_at).toISOString() : undefined })),
    ...brands.filter((b) => b.product_ids.length).map((b) => ({ path: `/marka/${b.handle}` })),
    ...(posts.length ? [{ path: "/blog" }, ...posts] : []),
    ...products,
  ].slice(0, MAX_URLS)
}
