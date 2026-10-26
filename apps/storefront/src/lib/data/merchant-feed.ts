import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { sdk } from "../medusa"
import { sortVariants } from "../variant-order"
import type { FeedProduct } from "../seo/merchant-feed"
import { listBrands, variantInStock } from "./products"
import { getDefaultRegion } from "./regions"

const PAGE = 200
/** Górny limit pozycji w jednym pliku feedu; przy większym katalogu feed trzeba podzielić. */
const MAX_PRODUCTS = 20_000

const FIELDS =
  "id,title,handle,subtitle,description,thumbnail,*images,categories.name,*variants.calculated_price,variants.title,variants.sku,variants.ean,variants.variant_rank,variants.inventory_quantity,variants.manage_inventory,variants.allow_backorder"

/** Opublikowane produkty kanału sklepu z cenami regionu domyślnego (PLN) i marką. */
export async function listFeedProducts(): Promise<FeedProduct[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("products", "brands")
  const region = await getDefaultRegion()
  const brands = await listBrands()
  const brandByProduct = new Map(brands.flatMap((b) => b.product_ids.map((id) => [id, b.name] as const)))
  const result: FeedProduct[] = []
  for (let offset = 0; offset < MAX_PRODUCTS; offset += PAGE) {
    const { products, count } = await sdk.store.product.list({ fields: FIELDS, region_id: region?.id, limit: PAGE, offset, order: "created_at" })
    for (const p of products) {
      const images = (p.images ?? []).map((i) => i.url)
      result.push({
        id: p.id,
        title: p.title,
        handle: p.handle,
        description: p.description ?? null,
        subtitle: p.subtitle ?? null,
        images: images.length ? images : p.thumbnail ? [p.thumbnail] : [],
        category: p.categories?.[0]?.name ?? null,
        brand: brandByProduct.get(p.id) ?? null,
        variants: sortVariants(p.variants ?? []).map((v) => {
          const price = v.calculated_price
          const amount = typeof price?.calculated_amount === "number" ? price.calculated_amount : null
          return {
            id: v.id,
            title: v.title ?? "",
            sku: v.sku ?? null,
            ean: v.ean ?? null,
            price:
              amount === null
                ? null
                : {
                    amount,
                    currency: price?.currency_code ?? "pln",
                    original: typeof price?.original_amount === "number" && price.original_amount > amount ? price.original_amount : null,
                  },
            inStock: variantInStock(v),
          }
        }),
      })
    }
    if (offset + PAGE >= count) {
      break
    }
  }
  return result
}
