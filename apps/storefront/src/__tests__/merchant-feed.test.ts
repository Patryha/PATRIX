import { describe, expect, it } from "vitest"
import { buildFeedItems, renderFeed, validGtin, type FeedProduct } from "@/lib/seo/merchant-feed"

// Dane wyłącznie testowe (kody GTIN z poprawną cyfrą kontrolną, nie są to prawdziwe produkty).
const product = (overrides: Partial<FeedProduct> = {}): FeedProduct => ({
  id: "prod_1",
  title: "TEST Krem",
  handle: "test-krem",
  description: "<p>Opis  i\nskład</p>",
  subtitle: null,
  images: ["https://cdn.test/a.jpg", "/test-assets/b.png"],
  category: "Pielęgnacja",
  brand: "TESTMARKE",
  variants: [{ id: "variant_1", title: "Default", sku: "TEST-1", ean: "4006381333931", price: { amount: 12.5, currency: "pln", original: null }, inStock: true }],
  ...overrides,
})

describe("validGtin", () => {
  it("accepts global GTINs with a correct check digit only", () => {
    expect(validGtin("4006381333931")).toBe("4006381333931")
    expect(validGtin("4006381333932")).toBeNull()
    expect(validGtin("96385074")).toBe("96385074")
    expect(validGtin("abc")).toBeNull()
    expect(validGtin(null)).toBeNull()
  })

  it("rejects in-store codes (prefix 2) that Google does not accept", () => {
    expect(validGtin("2000000000011")).toBeNull()
  })
})

describe("buildFeedItems", () => {
  it("maps a single-variant product with identifiers", () => {
    const [item] = buildFeedItems([product()], "https://patrix.test")
    expect(item).toMatchObject({
      id: "TEST-1",
      item_group_id: null,
      title: "TEST Krem",
      description: "Opis i skład",
      link: "https://patrix.test/produkt/test-krem",
      image_link: "https://cdn.test/a.jpg",
      additional_image_links: ["https://patrix.test/test-assets/b.png"],
      availability: "in_stock",
      price: "12.50 PLN",
      sale_price: null,
      brand: "TESTMARKE",
      gtin: "4006381333931",
      identifier_exists: true,
      product_type: "Pielęgnacja",
    })
  })

  it("groups variants, links to the chosen variant and reports promotions as sale price", () => {
    const items = buildFeedItems(
      [
        product({
          variants: [
            { id: "variant_a", title: "50 ml", sku: "TEST-50", ean: null, price: { amount: 9, currency: "pln", original: 12 }, inStock: false },
            { id: "variant_b", title: "100 ml", sku: null, ean: "2000000000011", price: { amount: 15, currency: "pln", original: null }, inStock: true },
          ],
        }),
      ],
      "https://patrix.test"
    )
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      id: "TEST-50",
      item_group_id: "prod_1",
      title: "TEST Krem – 50 ml",
      link: "https://patrix.test/produkt/test-krem?wariant=variant_a",
      availability: "out_of_stock",
      price: "12.00 PLN",
      sale_price: "9.00 PLN",
      gtin: null,
      mpn: "TEST-50",
      identifier_exists: true,
    })
    // brak SKU i kod wewnętrzny zamiast GTIN: id wariantu i brak identyfikatorów
    expect(items[1]).toMatchObject({ id: "variant_b", gtin: null, mpn: null, identifier_exists: false })
  })

  it("skips products without an image and variants without a price", () => {
    const noImage = product({ id: "prod_2", images: [] })
    const noPrice = product({ id: "prod_3", variants: [{ ...product().variants[0], price: null }] })
    expect(buildFeedItems([noImage, noPrice], "https://patrix.test")).toEqual([])
  })
})

describe("renderFeed", () => {
  it("renders escaped RSS with the Google namespace", () => {
    const items = buildFeedItems([product({ title: 'TEST <Krem> & "Pflege"', brand: null, variants: [{ ...product().variants[0], ean: null }] })], "https://patrix.test")
    const xml = renderFeed(items, { title: "PATRIX", link: "https://patrix.test", description: "Produkty" })
    expect(xml).toContain('<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">')
    expect(xml).toContain("<g:title>TEST &lt;Krem&gt; &amp; &quot;Pflege&quot;</g:title>")
    expect(xml).toContain("<g:condition>new</g:condition>")
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>")
    expect(xml).not.toContain("<g:brand>")
  })
})
