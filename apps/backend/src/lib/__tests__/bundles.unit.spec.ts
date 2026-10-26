import { isKit, kitVariantIds } from "../catalog/bundles"

describe("zestawy (inventory kits)", () => {
  it("zwykły wariant z jedną pozycją magazynową nie jest zestawem", () => {
    expect(isKit([{ required_quantity: 1 }])).toBe(false)
    expect(isKit([])).toBe(false)
  })

  it("zestawem jest wariant z kilkoma pozycjami albo z ilością większą niż 1", () => {
    expect(isKit([{ required_quantity: 1 }, { required_quantity: 1 }])).toBe(true)
    expect(isKit([{ required_quantity: 2 }])).toBe(true)
  })

  it("wybiera tylko warianty-zestawy z listy powiązań", () => {
    const links = [
      { variant_id: "v1", inventory_item_id: "i1", required_quantity: 1 },
      { variant_id: "v2", inventory_item_id: "i1", required_quantity: 2 },
      { variant_id: "v3", inventory_item_id: "i1", required_quantity: 1 },
      { variant_id: "v3", inventory_item_id: "i2", required_quantity: 1 },
    ]
    expect(kitVariantIds(links)).toEqual(["v2", "v3"])
  })
})
