import { describe, expect, it } from "vitest"
import { applyListing, listingHref, parseListingParams, PAGE_SIZE, sortOptions } from "@/lib/catalog-filters"
import type { ProductSummary } from "@/lib/data/products"
import { jsonLd } from "@/lib/seo/json-ld"

const product = (id: string, amount: number | null, inStock = true, title = id): ProductSummary => ({
  id,
  title,
  handle: id,
  subtitle: null,
  thumbnail: null,
  price: amount === null ? null : { amount, currency: "pln", original: null },
  inStock,
})

describe("parseListingParams", () => {
  it("ignores unknown sort and unsafe brand handles", () => {
    const p = parseListingParams({ sort: "drop table", marka: ["persil,<script>", "ariel"], strona: "-3", dostepne: "1" })
    expect(p).toEqual({ sort: "newest", defaultSort: "newest", brands: ["persil", "ariel"], inStock: true, page: 1 })
  })

  it("offers relevance only where it is the default (search)", () => {
    expect(parseListingParams({ sort: "relevance" }).sort).toBe("newest")
    expect(parseListingParams({}, "relevance").sort).toBe("relevance")
    expect(parseListingParams({ sort: "price_asc" }, "relevance").sort).toBe("price_asc")
    expect(sortOptions("newest").map(([v]) => v)).not.toContain("relevance")
    expect(sortOptions("relevance")[0][0]).toBe("relevance")
  })
})

describe("applyListing", () => {
  const items = [product("a", 10), product("b", 5, false), product("c", null), product("d", 20, true, "Ćma")]
  const brands = [{ handle: "x", name: "X", productIds: ["a", "b", "zzz"] }]

  it("sorts by price with unpriced items last", () => {
    const r = applyListing(items, brands, { sort: "price_asc", defaultSort: "newest" as const, brands: [], inStock: false, page: 1 })
    expect(r.products.map((p) => p.id)).toEqual(["b", "a", "d", "c"])
    const d = applyListing(items, brands, { sort: "price_desc", defaultSort: "newest" as const, brands: [], inStock: false, page: 1 })
    expect(d.products.map((p) => p.id)).toEqual(["d", "a", "b", "c"])
  })

  it("filters by brand and availability and counts facets within the listing", () => {
    const r = applyListing(items, brands, { sort: "newest", defaultSort: "newest" as const, brands: ["x"], inStock: true, page: 1 })
    expect(r.products.map((p) => p.id)).toEqual(["a"])
    expect(r.facets).toEqual([{ handle: "x", name: "X", count: 2 }])
  })

  it("clamps the page number", () => {
    const many = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => product(`p${i}`, i))
    const r = applyListing(many, [], { sort: "newest", defaultSort: "newest" as const, brands: [], inStock: false, page: 99 })
    expect(r.page).toBe(2)
    expect(r.pages).toBe(2)
    expect(r.products).toHaveLength(1)
  })
})

describe("listingHref", () => {
  it("keeps extra params and drops defaults", () => {
    const base = { sort: "newest" as const, defaultSort: "newest" as const, brands: [], inStock: false, page: 3 }
    expect(listingHref("/szukaj", base, { page: 1 }, { q: "persil" })).toBe("/szukaj?q=persil")
    expect(listingHref("/k", base, { sort: "price_asc", brands: ["a", "b"] })).toBe("/k?sort=price_asc&marka=a%2Cb&strona=3")
    const search = { ...base, sort: "relevance" as const, defaultSort: "relevance" as const }
    expect(listingHref("/szukaj", search, { page: 1 }, { q: "zel" })).toBe("/szukaj?q=zel")
    expect(listingHref("/szukaj", search, { sort: "newest", page: 1 }, { q: "zel" })).toBe("/szukaj?q=zel&sort=newest")
  })
})

describe("jsonLd", () => {
  it("cannot close the script tag", () => {
    expect(jsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>")
  })
})
