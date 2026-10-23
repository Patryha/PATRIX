import type { ProductSummary } from "./data/products"

export const SORTS = {
  newest: "Najnowsze",
  price_asc: "Cena: od najniższej",
  price_desc: "Cena: od najwyższej",
  name_asc: "Nazwa: A–Z",
} as const
export type Sort = keyof typeof SORTS

export const PAGE_SIZE = 24

export type ListingParams = { sort: Sort; brands: string[]; inStock: boolean; page: number }

type Raw = Record<string, string | string[] | undefined>
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Odczyt parametrów listingu z adresu URL (wartości spoza listy są ignorowane). */
export function parseListingParams(raw: Raw): ListingParams {
  const sort = first(raw.sort)
  const brandParam = raw.marka
  const brands = (Array.isArray(brandParam) ? brandParam : brandParam ? [brandParam] : [])
    .flatMap((b) => b.split(","))
    .map((b) => b.trim())
    .filter((b) => /^[a-z0-9-]{1,80}$/.test(b))
    .slice(0, 20)
  const page = Number.parseInt(first(raw.strona) ?? "1", 10)
  return {
    sort: sort && sort in SORTS ? (sort as Sort) : "newest",
    brands,
    inStock: first(raw.dostepne) === "1",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  }
}

export type BrandFacet = { handle: string; name: string; productIds: string[] }

/**
 * Filtrowanie, sortowanie i stronicowanie listy produktów (kolejność „newest” zachowuje kolejność wejścia).
 * Produkty bez ceny trafiają na koniec przy sortowaniu po cenie.
 */
export function applyListing(products: ProductSummary[], brands: BrandFacet[], params: ListingParams) {
  const ids = new Set(products.map((p) => p.id))
  const facets = brands
    .map((b) => ({ handle: b.handle, name: b.name, count: b.productIds.filter((id) => ids.has(id)).length }))
    .filter((b) => b.count > 0)

  let result = products
  if (params.brands.length) {
    const allowed = new Set(brands.filter((b) => params.brands.includes(b.handle)).flatMap((b) => b.productIds))
    result = result.filter((p) => allowed.has(p.id))
  }
  if (params.inStock) {
    result = result.filter((p) => p.inStock)
  }
  const price = (p: ProductSummary) => p.price?.amount ?? Number.POSITIVE_INFINITY
  if (params.sort === "price_asc") {
    result = [...result].sort((a, b) => price(a) - price(b))
  } else if (params.sort === "price_desc") {
    result = [...result].sort((a, b) => (b.price?.amount ?? -1) - (a.price?.amount ?? -1))
  } else if (params.sort === "name_asc") {
    result = [...result].sort((a, b) => a.title.localeCompare(b.title, "pl"))
  }
  const total = result.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(params.page, pages)
  return { products: result.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total, page, pages, facets }
}

/** Adres listingu z nowymi parametrami (puste wartości są pomijane, filtr resetuje stronę). */
export function listingHref(
  pathname: string,
  params: ListingParams,
  patch: Partial<ListingParams>,
  extra: Record<string, string> = {}
) {
  const next = { ...params, ...patch }
  const search = new URLSearchParams(extra)
  if (next.sort !== "newest") search.set("sort", next.sort)
  if (next.brands.length) search.set("marka", next.brands.join(","))
  if (next.inStock) search.set("dostepne", "1")
  if (next.page > 1) search.set("strona", String(next.page))
  const qs = search.toString()
  return qs ? `${pathname}?${qs}` : pathname
}
