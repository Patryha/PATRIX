import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { cacheLife, cacheTag } from "next/cache"
import { sdk } from "../medusa"

export type Category = Pick<HttpTypes.StoreProductCategory, "id" | "name" | "handle" | "description" | "rank"> & {
  category_children?: Category[]
}

/** Kategorie najwyższego poziomu z podkategoriami (mega menu, strona główna). */
export async function listTopCategories(): Promise<Category[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("categories")
  const { product_categories } = await sdk.store.category.list({
    parent_category_id: "null",
    include_descendants_tree: true,
    fields: "id,name,handle,description,rank,*category_children",
    limit: 100,
  })
  return [...product_categories].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)) as Category[]
}

export async function getCategoryByHandle(handle: string): Promise<Category | null> {
  "use cache"
  cacheLife("minutes")
  cacheTag("categories", `category:${handle}`)
  const { product_categories } = await sdk.store.category.list({
    handle,
    fields: "id,name,handle,description,rank,*category_children",
    limit: 1,
  })
  return (product_categories[0] as Category | undefined) ?? null
}
