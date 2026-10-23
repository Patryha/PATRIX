import { checkCompleteness, isValidGtin, type ComplianceData, type ProductFacts } from "../compliance"

const facts: ProductFacts = { hasImage: true, variants: [{ id: "v1", sku: "PX-1", ean: "4006381333931", hasPrice: true }] }
const gpsr: ComplianceData = {
  manufacturer_name: "Producent GmbH",
  manufacturer_address: "Musterstraße 1, 10115 Berlin, DE",
  manufacturer_contact: "kontakt@example.com",
  polish_label_verified: true,
}
const fields = (r: ReturnType<typeof checkCompleteness>) => r.missing.map((m) => m.field)

describe("isValidGtin", () => {
  it("validates check digits", () => {
    expect(isValidGtin("4006381333931")).toBe(true)
    expect(isValidGtin("4006381333932")).toBe(false)
    expect(isValidGtin("96385074")).toBe(true)
    expect(isValidGtin("abc")).toBe(false)
  })
})

describe("checkCompleteness", () => {
  it("blocks a product without any data", () => {
    const r = checkCompleteness(null, { hasImage: false, variants: [] })
    expect(r.complete).toBe(false)
    expect(fields(r)).toEqual(expect.arrayContaining(["images", "variants", "manufacturer_name", "polish_label_verified"]))
  })

  it("accepts a general product with GPSR data", () => {
    expect(checkCompleteness({ ...gpsr, product_kind: "general" }, facts)).toMatchObject({ complete: true, missing: [] })
  })

  it("requires an EU responsible person when the manufacturer is outside the EU", () => {
    expect(fields(checkCompleteness({ ...gpsr, manufacturer_in_eu: false }, facts))).toEqual(["eu_responsible_name", "eu_responsible_address"])
  })

  it("rejects invalid EAN and missing prices or SKU", () => {
    const r = checkCompleteness(gpsr, { hasImage: true, variants: [{ id: "v", sku: "", ean: "123", hasPrice: false }] })
    expect(fields(r)).toEqual(expect.arrayContaining(["prices", "sku", "ean"]))
  })

  it("requires food information (1169/2011)", () => {
    const r = checkCompleteness({ ...gpsr, product_kind: "food", nutrition: { energy_kj: 1, fat: 2 } }, facts)
    expect(fields(r)).toEqual(expect.arrayContaining(["net_quantity", "ingredients", "allergens", "nutrition"]))
    expect(r.missing.find((m) => m.field === "nutrition")!.message).toContain("energy_kcal")
  })

  it("accepts complete food data and warns about country of origin", () => {
    const r = checkCompleteness(
      {
        ...gpsr,
        product_kind: "food",
        net_quantity: 100,
        net_quantity_unit: "g",
        ingredients: "cukier, kakao",
        allergens_confirmed: true,
        nutrition: { energy_kj: 2200, energy_kcal: 530, fat: 30, saturates: 18, carbohydrate: 55, sugars: 50, protein: 6, salt: 0.2 },
      },
      facts
    )
    expect(r.complete).toBe(true)
    expect(r.warnings.map((w) => w.field)).toContain("country_of_origin")
  })

  it("requires CLP elements and UFI for classified chemicals", () => {
    const base = { ...gpsr, product_kind: "household_chemical" as const, net_quantity: 1, net_quantity_unit: "l", ingredients: "<5% niejonowe ZPC" }
    expect(fields(checkCompleteness(base, facts))).toEqual(["clp_signal_word"])
    expect(checkCompleteness({ ...base, clp_signal_word: "not_classified" }, facts).complete).toBe(true)
    expect(fields(checkCompleteness({ ...base, clp_signal_word: "danger", ufi_code: "zly" }, facts))).toEqual([
      "clp_hazard_statements",
      "clp_pictograms",
      "ufi_code",
    ])
    expect(
      checkCompleteness(
        { ...base, clp_signal_word: "danger", clp_hazard_statements: ["H318"], clp_pictograms: ["GHS05"], ufi_code: "N1QV-R0P7-W00U-7M5R" },
        facts
      ).complete
    ).toBe(true)
  })

  it("requires INCI and an EU responsible person for cosmetics", () => {
    const r = checkCompleteness({ ...gpsr, product_kind: "cosmetic", net_quantity: 250, net_quantity_unit: "ml" }, facts)
    expect(fields(r)).toEqual(["eu_responsible_name", "eu_responsible_address", "ingredients"])
  })
})
