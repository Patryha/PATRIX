import { buildSearchIndex, editDistance, normalize, search } from "../search"

const doc = (id: string, title: string, extra: { brand?: string; original?: string; category?: string; codes?: string[] } = {}) => ({
  id,
  fields: [
    { text: title, weight: 4 },
    { text: extra.brand, weight: 3 },
    { text: extra.original, weight: 3 },
    { text: extra.category, weight: 2 },
  ],
  codes: extra.codes ?? [],
})

const index = buildSearchIndex(
  [
    doc("p1", "Proszek do prania kolorów 1,3 kg", { brand: "Testmarke", original: "Colorwaschmittel Pulver", category: "Pranie", codes: ["4000000000001", "TM-PR-13"] }),
    doc("p2", "Żel do prania 1,5 l", { brand: "Testmarke", original: "Flüssigwaschmittel", category: "Pranie" }),
    doc("p3", "Płyn do mycia naczyń 500 ml", { brand: "Spülfix", category: "Kuchnia" }),
    doc("p4", "Krem do rąk", { brand: "Hautpflege", category: "Kosmetyki" }),
  ],
  [["kapsułki", "kostki do prania", "pods"], ["detergent", "proszek"]]
)

const ids = (q: string) => search(index, q).hits.map((h) => h.id)

describe("normalize", () => {
  it("usuwa polskie i niemieckie znaki", () => {
    expect(normalize("Żel ŁÓDŹ Spülmittel Straße")).toBe("zel lodz spulmittel strasse")
  })
})

describe("editDistance", () => {
  it("liczy przestawienie liter jako jedną zmianę", () => {
    expect(editDistance("prosezk", "proszek")).toBe(1)
    expect(editDistance("abc", "xyz", 1)).toBe(2)
  })
})

describe("search", () => {
  it("znajduje bez polskich znaków i z literówką", () => {
    expect(ids("zel do prania")).toEqual(["p2"])
    expect(ids("plyn naczyn")).toEqual(["p3"])
    expect(ids("prosek")).toEqual(["p1"])
  })

  it("dopasowuje początek słowa podczas pisania i część słowa złożonego", () => {
    expect(ids("kre")).toEqual(["p4"])
    expect(ids("waschmittel")).toEqual(expect.arrayContaining(["p1", "p2"]))
    expect(ids("spulfix")).toEqual(["p3"])
  })

  it("stawia wyżej trafienie w nazwie niż w kategorii, a przy remisie krótszą nazwę", () => {
    expect(ids("proszek prania")[0]).toBe("p1")
    const tie = buildSearchIndex([doc("set", "Zestaw: 2 × Krem do rąk"), doc("one", "Krem do rąk")])
    expect(search(tie, "krem do rak").hits.map((h) => h.id)).toEqual(["one", "set"])
  })

  it("znajduje po dokładnym kodzie EAN albo SKU", () => {
    expect(ids("4000000000001")).toEqual(["p1"])
    expect(ids("TM-PR-13")).toEqual(["p1"])
    expect(ids("tm pr 13")).toEqual(["p1"])
  })

  it("rozwija synonimy, także wielowyrazowe", () => {
    expect(ids("detergent")).toEqual(["p1"])
    expect(ids("kostki do prania")).toEqual([])
  })

  it("zwraca wyniki częściowe i podpowiedź poprawki, gdy całość nie pasuje", () => {
    const result = search(index, "krem xyzzyqq")
    expect(result.partial).toBe(true)
    expect(result.hits.map((h) => h.id)).toEqual(["p4"])
    expect(search(index, "kremik").suggestion).toBe("krem")
  })

  it("ogranicza wyniki do dozwolonych produktów", () => {
    expect(search(index, "prania", { allowedIds: new Set(["p2"]) }).hits.map((h) => h.id)).toEqual(["p2"])
  })
})
