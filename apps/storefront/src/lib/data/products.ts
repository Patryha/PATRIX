import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { cacheLife, cacheTag } from "next/cache"
import { sdk } from "../medusa"
import { getDefaultRegion } from "./regions"

export type ProductSummary = {
  id: string
  title: string
  handle: string
  subtitle: string | null
  thumbnail: string | null
  price: { amount: number; currency: string; original: number | null } | null
  inStock: boolean
}

export type ProductQuery = {
  categoryId?: string
  q?: string
  limit?: number
  offset?: number
  order?: "created_at" | "-created_at" | "title"
}

const FIELDS =
  "id,title,handle,subtitle,thumbnail,*variants.calculated_price,variants.inventory_quantity,variants.manage_inventory,variants.allow_backorder"

function toSummary(product: HttpTypes.StoreProduct): ProductSummary {
  const variants = product.variants ?? []
  const priced = variants
    .map((v) => v.calculated_price)
    .filter((p): p is NonNullable<typeof p> => !!p && typeof p.calculated_amount === "number")
    .sort((a, b) => (a.calculated_amount ?? 0) - (b.calculated_amount ?? 0))
  const cheapest = priced[0]
  const inStock = variants.some(
    (v) => !v.manage_inventory || v.allow_backorder || (v.inventory_quantity ?? 0) > 0
  )
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    subtitle: product.subtitle ?? null,
    thumbnail: product.thumbnail ?? null,
    price: cheapest
      ? {
          amount: cheapest.calculated_amount as number,
          currency: cheapest.currency_code ?? "pln",
          original:
            typeof cheapest.original_amount === "number" && cheapest.original_amount > (cheapest.calculated_amount ?? 0)
              ? cheapest.original_amount
              : null,
        }
      : null,
    inStock,
  }
}

export async function listProducts(query: ProductQuery = {}): Promise<{ products: ProductSummary[]; count: number }> {
  "use cache"
  cacheLife("minutes")
  cacheTag("products")
  const region = await getDefaultRegion()
  const { products, count } = await sdk.store.product.list({
    fields: FIELDS,
    region_id: region?.id,
    limit: query.limit ?? 24,
    offset: query.offset ?? 0,
    order: query.order ?? "-created_at",
    ...(query.categoryId ? { category_id: [query.categoryId] } : {}),
    ...(query.q ? { q: query.q } : {}),
  })
  return { products: products.map(toSummary), count }
}

export type ProductDetail = ProductSummary & {
  description: string | null
  images: { id: string; url: string }[]
  categories: { id: string; name: string; handle: string }[]
}

export async function getProductByHandle(handle: string): Promise<ProductDetail | null> {
  "use cache"
  cacheLife("minutes")
  cacheTag("products", `product:${handle}`)
  const region = await getDefaultRegion()
  const { products } = await sdk.store.product.list({
    handle,
    region_id: region?.id,
    fields: `${FIELDS},description,*images,*categories`,
    limit: 1,
  })
  const product = products[0]
  if (!product) {
    return null
  }
  return {
    ...toSummary(product),
    description: product.description ?? null,
    images: (product.images ?? []).map((i) => ({ id: i.id, url: i.url })),
    categories: (product.categories ?? []).map((c) => ({ id: c.id, name: c.name, handle: c.handle })),
  }
}
