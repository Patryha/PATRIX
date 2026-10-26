import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { cacheLife, cacheTag } from "next/cache"
import { sdk } from "../medusa"
import type { UnitMeasure } from "../format"
import { sortVariants } from "../variant-order"
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
  const inStock = variants.some(variantInStock)
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

export type VariantDetail = {
  id: string
  title: string
  sku: string | null
  ean: string | null
  price: { amount: number; currency: string; original: number | null } | null
  inStock: boolean
  options: Record<string, string>
}

export type Compliance = {
  product_kind: "general" | "food" | "household_chemical" | "cosmetic"
  name_original: string | null
  manufacturer_name: string | null
  manufacturer_address: string | null
  manufacturer_contact: string | null
  manufacturer_in_eu: boolean
  eu_responsible_name: string | null
  eu_responsible_address: string | null
  country_of_origin: string | null
  net_quantity: number | null
  net_quantity_unit: UnitMeasure["unit"] | null
  ingredients: string | null
  allergens: string[] | null
  nutrition: Record<string, number | null> | null
  storage_conditions: string | null
  usage_instructions: string | null
  warnings: string | null
  clp_signal_word: "not_classified" | "warning" | "danger" | null
  clp_hazard_statements: string[] | null
  clp_precautionary_statements: string[] | null
  clp_pictograms: string[] | null
  ufi_code: string | null
  cosmetic_pao_months: number | null
  cosmetic_function: string | null
}

const CATALOG_LIMIT = 500
const CATALOG_PAGE = 100

/**
 * Pełna lista produktów kategorii, wyszukiwania lub zestawu id do filtrowania i sortowania po stronie sklepu
 * (do CATALOG_LIMIT pozycji). Przy większym katalogu zadanie przejmie wyszukiwarka (Etap 7).
 */
export async function listCatalog(query: { categoryId?: string; q?: string; ids?: string[] }): Promise<ProductSummary[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("products")
  if (query.ids && !query.ids.length) {
    return []
  }
  const region = await getDefaultRegion()
  const all: ProductSummary[] = []
  for (let offset = 0; offset < CATALOG_LIMIT; offset += CATALOG_PAGE) {
    const { products, count } = await sdk.store.product.list({
      fields: FIELDS,
      region_id: region?.id,
      limit: CATALOG_PAGE,
      offset,
      order: "-created_at",
      ...(query.categoryId ? { category_id: [query.categoryId] } : {}),
      ...(query.q ? { q: query.q } : {}),
      ...(query.ids ? { id: query.ids } : {}),
    })
    all.push(...products.map(toSummary))
    if (offset + CATALOG_PAGE >= count) {
      break
    }
  }
  return all
}

export type BrandSummary = { id: string; name: string; handle: string; product_ids: string[] }

export async function listBrands(): Promise<BrandSummary[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("brands")
  const { brands } = await sdk.client.fetch<{ brands: BrandSummary[] }>("/store/patrix/brands").catch(() => ({ brands: [] }))
  return brands
}

export type ProductDetail = ProductSummary & {
  description: string | null
  images: { id: string; url: string }[]
  categories: { id: string; name: string; handle: string }[]
  options: { id: string; title: string; values: string[] }[]
  variants: VariantDetail[]
  compliance: Compliance | null
  brand: { id: string; name: string; handle: string } | null
  /** Najniższa cena z 30 dni przed obecną ceną, per wariant (Omnibus). */
  lowest30d: Record<string, number | null>
  measure: UnitMeasure | null
  /** Skład zestawu dla wariantów, które są zestawami (pusta lista dla zwykłych produktów). */
  bundles: BundleContents[]
}

type DetailsResponse = {
  compliance: Compliance | null
  brand: { id: string; name: string; handle: string } | null
  omnibus: { variant_id: string; lowest_price_30d: number | null }[]
  bundles?: BundleContents[]
}

export type BundleContents = {
  variant_id: string
  items: { title: string; variant_title: string | null; handle: string | null; quantity: number }[]
}

export function variantInStock(v: HttpTypes.StoreProductVariant) {
  return !v.manage_inventory || !!v.allow_backorder || (v.inventory_quantity ?? 0) > 0
}

export async function getProductByHandle(handle: string): Promise<ProductDetail | null> {
  "use cache"
  cacheLife("minutes")
  cacheTag("products", `product:${handle}`)
  const region = await getDefaultRegion()
  const { products } = await sdk.store.product.list({
    handle,
    region_id: region?.id,
    fields: `${FIELDS},description,*images,*categories,*options,*options.values,variants.title,variants.sku,variants.ean,variants.variant_rank,*variants.options`,
    limit: 1,
  })
  const product = products[0]
  if (!product) {
    return null
  }
  const details = await sdk.client
    .fetch<DetailsResponse>(`/store/patrix/products/${product.id}/details`)
    .catch(() => ({ compliance: null, brand: null, omnibus: [] }) as DetailsResponse)
  const optionTitle = new Map((product.options ?? []).map((o) => [o.id, o.title]))
  const compliance = details.compliance
  return {
    ...toSummary(product),
    description: product.description ?? null,
    images: (product.images ?? []).map((i) => ({ id: i.id, url: i.url })),
    categories: (product.categories ?? []).map((c) => ({ id: c.id, name: c.name, handle: c.handle })),
    options: (product.options ?? []).map((o) => ({ id: o.id, title: o.title, values: (o.values ?? []).map((v) => v.value) })),
    variants: sortVariants(product.variants ?? []).map((v) => {
      const p = v.calculated_price
      const amount = typeof p?.calculated_amount === "number" ? p.calculated_amount : null
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
                currency: p?.currency_code ?? "pln",
                original: typeof p?.original_amount === "number" && p.original_amount > amount ? p.original_amount : null,
              },
        inStock: variantInStock(v),
        options: Object.fromEntries(
          (v.options ?? []).map((o) => [optionTitle.get(o.option_id ?? "") ?? o.option_id ?? "", o.value])
        ),
      }
    }),
    compliance,
    brand: details.brand,
    lowest30d: Object.fromEntries(details.omnibus.map((o) => [o.variant_id, o.lowest_price_30d])),
    bundles: details.bundles ?? [],
    measure:
      compliance?.net_quantity && compliance.net_quantity_unit
        ? { quantity: compliance.net_quantity, unit: compliance.net_quantity_unit }
        : null,
  }
}

/** Produkty po uchwytach, w podanej kolejności (sekcje CMS, ostatnio oglądane). Nieopublikowane są pomijane. */
export async function listProductsByHandles(handles: string[]): Promise<ProductSummary[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("products")
  if (!handles.length) {
    return []
  }
  const region = await getDefaultRegion()
  const { products } = await sdk.store.product.list({ fields: FIELDS, region_id: region?.id, handle: handles, limit: handles.length })
  const byHandle = new Map(products.map((p) => [p.handle, toSummary(p)]))
  return handles.map((h) => byHandle.get(h)).filter((p): p is ProductSummary => !!p)
}
