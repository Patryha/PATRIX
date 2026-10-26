import { DEFAULT_HOME, PageContentSchema } from "../../modules/patrix-cms"

const rail = { id: "rail1", type: "product_rail", enabled: true, title: "Polecane", source: "newest", limit: 8 }

describe("schemat sekcji CMS", () => {
  it("przyjmuje domyślną stronę główną", () => {
    expect(PageContentSchema.safeParse(DEFAULT_HOME).success).toBe(true)
  })

  it("odrzuca nieznany typ sekcji i pola spoza schematu w treści", () => {
    expect(PageContentSchema.safeParse({ sections: [{ id: "x123", type: "html", html: "<script>" }] }).success).toBe(false)
  })

  it("odrzuca linki javascript: i adresy http", () => {
    const hero = (href: string) => ({
      sections: [{ id: "hero1", type: "hero_slider", slides: [{ title: "T", cta_label: "Kup", cta_href: href }] }],
    })
    expect(PageContentSchema.safeParse(hero("/kategoria/promocje")).success).toBe(true)
    expect(PageContentSchema.safeParse(hero("https://example.com/a")).success).toBe(true)
    expect(PageContentSchema.safeParse(hero("javascript:alert(1)")).success).toBe(false)
    expect(PageContentSchema.safeParse(hero("//evil.example")).success).toBe(false)
    expect(PageContentSchema.safeParse(hero("http://example.com")).success).toBe(false)
  })

  it("wymaga tekstu alternatywnego dla obrazu i kompletnego przycisku", () => {
    const slide = (s: object) => ({ sections: [{ id: "hero1", type: "hero_slider", slides: [{ title: "T", ...s }] }] })
    expect(PageContentSchema.safeParse(slide({ image_url: "/a.png" })).success).toBe(false)
    expect(PageContentSchema.safeParse(slide({ image_url: "/a.png", image_alt: "Opis" })).success).toBe(true)
    expect(PageContentSchema.safeParse(slide({ cta_label: "Kup" })).success).toBe(false)
  })

  it("karuzela produktów: źródło kategorii wymaga kategorii, ręczne wymaga produktów", () => {
    expect(PageContentSchema.safeParse({ sections: [rail] }).success).toBe(true)
    expect(PageContentSchema.safeParse({ sections: [{ ...rail, source: "category" }] }).success).toBe(false)
    expect(PageContentSchema.safeParse({ sections: [{ ...rail, source: "category", category_handle: "slodycze" }] }).success).toBe(true)
    expect(PageContentSchema.safeParse({ sections: [{ ...rail, source: "products", product_handles: [] }] }).success).toBe(false)
  })

  it("wymaga unikalnych identyfikatorów i co najwyżej jednego paska informacyjnego", () => {
    expect(PageContentSchema.safeParse({ sections: [rail, rail] }).success).toBe(false)
    const bar = (id: string) => ({ id, type: "announcement_bar", messages: [{ text: "Info" }] })
    expect(PageContentSchema.safeParse({ sections: [bar("bar1"), bar("bar2")] }).success).toBe(false)
  })
})
