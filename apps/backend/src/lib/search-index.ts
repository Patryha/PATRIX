import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../modules/patrix-catalog"
import { PATRIX_SEARCH_MODULE, type PatrixSearchService } from "../modules/patrix-search"
import { buildSearchIndex, normalize, search, type SearchIndex, type SearchResult } from "./search"

/** Indeks jest odświeżany najpóźniej po tym czasie; zmiany produktów i synonimów unieważniają go od razu. */
const INDEX_TTL_MS = 60_000
const MAX_PRODUCTS = 20_000
const PAGE = 1000
const MAX_QUERY_LENGTH = 100

/** Fraza z parametru adresu: 1–100 znaków, inaczej błąd 400. */
export function readSearchQuery(value: unknown) {
  const q = typeof value === "string" ? value.trim() : ""
  if (!q || q.length > MAX_QUERY_LENGTH) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Podaj frazę (1–${MAX_QUERY_LENGTH} znaków).`)
  }
  return q
}

export type ProductCard = { id: string; title: string; handle: string; thumbnail: string | null; brand: string | null; sales_channel_ids: string[] }
export type NamedLink = { name: string; handle: string }

type CatalogIndex = {
  index: SearchIndex
  products: Map<string, ProductCard>
  brands: (NamedLink & { key: string })[]
  categories: (NamedLink & { key: string })[]
  builtAt: number
}

type ProductGraph = {
  id: string
  title: string
  subtitle: string | null
  handle: string
  thumbnail: string | null
  description: string | null
  type?: { value: string } | null
  collection?: { title: string } | null
  tags?: { value: string }[] | null
  categories?: { name: string }[] | null
  variants?: { title: string | null; sku: string | null; ean: string | null; upc: string | null; barcode: string | null }[] | null
  sales_channels?: { id: string }[] | null
}

let cached: CatalogIndex | null = null
let building: Promise<CatalogIndex> | null = null

export function invalidateSearchIndex() {
  cached = null
}

export async function getCatalogIndex(container: MedusaContainer): Promise<CatalogIndex> {
  if (cached && Date.now() - cached.builtAt < INDEX_TTL_MS) {
    return cached
  }
  if (!building) {
    building = buildCatalogIndex(container)
      .then((built) => {
        cached = built
        return built
      })
      .finally(() => {
        building = null
      })
  }
  return building
}

async function buildCatalogIndex(container: MedusaContainer): Promise<CatalogIndex> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = container.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const searchModule = container.resolve<PatrixSearchService>(PATRIX_SEARCH_MODULE)

  const products: ProductGraph[] = []
  for (let skip = 0; skip < MAX_PRODUCTS; skip += PAGE) {
    const { data } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "subtitle",
        "handle",
        "thumbnail",
        "description",
        "type.value",
        "collection.title",
        "tags.value",
        "categories.name",
        "variants.title",
        "variants.sku",
        "variants.ean",
        "variants.upc",
        "variants.barcode",
        "sales_channels.id",
      ],
      filters: { status: "published" },
      pagination: { skip, take: PAGE, order: { created_at: "DESC" } },
    })
    products.push(...(data as ProductGraph[]))
    if (data.length < PAGE) {
      break
    }
  }

  const [brands, compliances, synonyms, { data: categories }] = await Promise.all([
    catalog.listBrands({}, { select: ["id", "name", "handle"] }),
    catalog.listProductCompliances({}, { select: ["product_id", "brand_id", "name_original"] }),
    searchModule.listSearchSynonyms({}, { select: ["terms"], take: 5000 }),
    query.graph({ entity: "product_category", fields: ["name", "handle"], filters: { is_active: true, is_internal: false } }),
  ])
  const brandById = new Map(brands.map((b) => [b.id, b]))
  const complianceByProduct = new Map(compliances.map((c) => [c.product_id, c]))

  const cards = new Map<string, ProductCard>()
  const inputs = products.map((p) => {
    const compliance = complianceByProduct.get(p.id)
    const brand = compliance?.brand_id ? brandById.get(compliance.brand_id) : undefined
    cards.set(p.id, {
      id: p.id,
      title: p.title,
      handle: p.handle,
      thumbnail: p.thumbnail,
      brand: brand?.name ?? null,
      sales_channel_ids: (p.sales_channels ?? []).map((s) => s.id),
    })
    const variants = p.variants ?? []
    return {
      id: p.id,
      fields: [
        { text: p.title, weight: 4 },
        { text: brand?.name, weight: 3 },
        { text: compliance?.name_original, weight: 3 },
        { text: p.subtitle, weight: 2 },
        { text: (p.categories ?? []).map((c) => c.name).join(" "), weight: 2 },
        { text: [p.type?.value, p.collection?.title, ...(p.tags ?? []).map((t) => t.value)].filter(Boolean).join(" "), weight: 1.5 },
        { text: variants.map((v) => v.title).join(" "), weight: 1 },
        { text: p.description, weight: 0.5 },
      ],
      codes: variants.flatMap((v) => [v.sku, v.ean, v.upc, v.barcode]),
    }
  })

  const groups = synonyms.map((s) => (Array.isArray(s.terms) ? (s.terms as unknown[]).filter((t): t is string => typeof t === "string") : []))
  return {
    index: buildSearchIndex(inputs, groups),
    products: cards,
    brands: brands.map((b) => ({ name: b.name, handle: b.handle, key: normalize(b.name) })),
    categories: (categories as { name: string; handle: string }[]).map((c) => ({ name: c.name, handle: c.handle, key: normalize(c.name) })),
    builtAt: Date.now(),
  }
}

/** Wyszukiwanie ograniczone do produktów z kanałów sprzedaży klucza publicznego (brak listy = wszystkie). */
export async function searchCatalog(
  container: MedusaContainer,
  q: string,
  options: { limit?: number; salesChannelIds?: string[] }
): Promise<SearchResult & { catalog: CatalogIndex }> {
  const catalog = await getCatalogIndex(container)
  const channels = options.salesChannelIds?.length ? new Set(options.salesChannelIds) : null
  const allowedIds = channels
    ? new Set([...catalog.products.values()].filter((p) => p.sales_channel_ids.some((id) => channels.has(id))).map((p) => p.id))
    : undefined
  return { ...search(catalog.index, q, { limit: options.limit, allowedIds }), catalog }
}

/** Marki i kategorie, których nazwa zawiera słowa frazy (podpowiedzi w polu wyszukiwania). */
export function matchNames(items: (NamedLink & { key: string })[], q: string, limit: number): NamedLink[] {
  const words = normalize(q).split(" ").filter((w) => w.length >= 2)
  if (!words.length) {
    return []
  }
  return items
    .filter((item) => words.every((w) => item.key.split(" ").some((k) => k.startsWith(w))))
    .slice(0, limit)
    .map(({ name, handle }) => ({ name, handle }))
}

/** Zapis frazy do statystyk (bez danych klienta); błąd zapisu nie psuje wyszukiwania. */
export async function recordSearchTerm(container: MedusaContainer, q: string, results: number) {
  const term = normalize(q).slice(0, 100)
  if (!term) {
    return
  }
  const searchModule = container.resolve<PatrixSearchService>(PATRIX_SEARCH_MODULE)
  try {
    const [existing] = await searchModule.listSearchTermStats({ term }, { take: 1 })
    const now = new Date()
    if (existing) {
      await searchModule.updateSearchTermStats({
        id: existing.id,
        searches: existing.searches + 1,
        zero_results: existing.zero_results + (results ? 0 : 1),
        last_results: results,
        last_searched_at: now,
      })
    } else {
      await searchModule.createSearchTermStats({ term, searches: 1, zero_results: results ? 0 : 1, last_results: results, last_searched_at: now })
    }
  } catch {
    // Statystyka jest pomocnicza: przy wyścigu dwóch pierwszych zapisów tej samej frazy jeden z nich może się nie udać.
  }
}
