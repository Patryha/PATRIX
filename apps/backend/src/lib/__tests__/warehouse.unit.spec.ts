import { allocateFefo, expiryState, fefoOrder, signedDelta, unitCosts } from "../warehouse"

const batch = (id: string, quantity: number, expiry: string | null, received = "2026-10-01") => ({ id, quantity, expiry_date: expiry, received_at: received })

describe("magazyn: FEFO i daty ważności", () => {
  it("kolejność: najbliższa data ważności, partie bez daty na końcu, przy równej dacie starsza dostawa", () => {
    const order = fefoOrder([
      batch("bez-daty", 5, null),
      batch("grudzien", 5, "2026-12-01"),
      batch("listopad-nowa", 5, "2026-11-15", "2026-10-20"),
      batch("listopad-stara", 5, "2026-11-15", "2026-10-01"),
    ]).map((b) => b.id)
    expect(order).toEqual(["listopad-stara", "listopad-nowa", "grudzien", "bez-daty"])
  })

  it("przydział z kilku partii, pomija puste, reszta bez partii jako untracked", () => {
    const batches = [batch("a", 3, "2026-11-01"), batch("pusta", 0, "2026-10-30"), batch("b", 4, "2026-12-01")]
    expect(allocateFefo(batches, 5)).toEqual({ allocations: [{ batch_id: "a", quantity: 3 }, { batch_id: "b", quantity: 2 }], untracked: 0 })
    expect(allocateFefo(batches, 9)).toEqual({ allocations: [{ batch_id: "a", quantity: 3 }, { batch_id: "b", quantity: 4 }], untracked: 2 })
    expect(allocateFefo([], 2)).toEqual({ allocations: [], untracked: 2 })
  })

  it("stan daty ważności: przeterminowana, kończy się w 30 dni, w porządku", () => {
    const now = new Date("2026-10-26T15:00:00Z")
    expect(expiryState("2026-10-25", now)).toBe("expired")
    expect(expiryState("2026-10-26", now)).toBe("soon")
    expect(expiryState("2026-11-25", now)).toBe("soon")
    expect(expiryState("2026-11-26", now)).toBe("ok")
    expect(expiryState(null, now)).toBeNull()
  })

  it("znak ilości: przyjęcie +, wydanie -, korekta ze znakiem; odrzuca zero, ułamki i ujemne przyjęcie", () => {
    expect(signedDelta("receipt", 5)).toBe(5)
    expect(signedDelta("issue", 5)).toBe(-5)
    expect(signedDelta("adjustment", -2)).toBe(-2)
    expect(() => signedDelta("receipt", 0)).toThrow()
    expect(() => signedDelta("issue", 1.5)).toThrow()
    expect(() => signedDelta("receipt", -1)).toThrow("ilość dodatnią")
  })
})

describe("unitCosts", () => {
  it("bierze cenę z wariantu z jedną sztuką towaru, pomija zestawy, przy sprzecznych cenach nie zgaduje", () => {
    const link = (id: string, items: [string, number][]) => ({ id, inventory_items: items.map(([inventory_item_id, required_quantity]) => ({ inventory_item_id, required_quantity })) })
    const costs = unitCosts(
      [link("v1", [["i1", 1]]), link("kit", [["i1", 2]]), link("v2", [["i2", 1]]), link("v3", [["i2", 1]]), link("v4", [["i3", 1]])],
      [
        { variant_id: "v1", purchase_price: 4.5 },
        { variant_id: "kit", purchase_price: 8 },
        { variant_id: "v2", purchase_price: 3 },
        { variant_id: "v3", purchase_price: 3.2 },
      ]
    )
    expect(costs.get("i1")).toBe(4.5)
    expect(costs.get("i2")).toBeNull()
    expect(costs.has("i3")).toBe(false)
  })
})
