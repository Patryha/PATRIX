import { boughtTogether, buildCoPurchase, similarProducts, type ProductFeatures } from "../recommendations"

describe("boughtTogether", () => {
  const pairs = buildCoPurchase([
    ["krem", "mydlo", "krem"],
    ["krem", "mydlo"],
    ["krem", "szampon"],
    ["zel", "plyn"],
    ["zel", "plyn", "mydlo"],
  ])

  it("pokazuje tylko pary z co najmniej 2 zamówień (pojedynczy koszyk nie jest ujawniany)", () => {
    expect(boughtTogether(pairs, ["krem"], 8)).toEqual(["mydlo"])
    expect(boughtTogether(pairs, ["szampon"], 8)).toEqual([])
  })

  it("sumuje dla koszyka, pomija produkty z koszyka i niedozwolone", () => {
    expect(boughtTogether(pairs, ["krem", "zel"], 8)).toEqual(["mydlo", "plyn"])
    expect(boughtTogether(pairs, ["krem", "mydlo"], 8)).toEqual([])
    expect(boughtTogether(pairs, ["zel"], 8, new Set(["mydlo"]))).toEqual([])
  })
})

describe("similarProducts", () => {
  const f = (id: string, categories: string[], brand: string | null, created_at = 0, tags: string[] = []): ProductFeatures => ({
    id,
    categories,
    brand,
    type: null,
    tags,
    created_at,
  })
  const target = f("a", ["pranie"], "m1")

  it("keeps the category, ranks by brand, skips itself and other categories; newer wins ties", () => {
    const candidates = [target, f("b", ["pranie"], "m2", 1), f("c", ["kuchnia"], "m1"), f("d", ["kuchnia"], "m3"), f("e", ["pranie"], "m1"), f("g", ["pranie"], "m2", 5)]
    expect(similarProducts(target, candidates, 8)).toEqual(["e", "g", "b"])
    expect(similarProducts(f("x", [], "m1"), candidates, 8)).toEqual(["a", "c", "e"])
    expect(similarProducts(target, candidates, 2)).toEqual(["e", "g"])
  })
})
