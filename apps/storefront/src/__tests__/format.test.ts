import { describe, expect, it } from "vitest"
import { formatPrice, unitPrice } from "@/lib/format"

const nbsp = (s: string) => s.replace(/\s/g, " ")

describe("formatPrice", () => {
  it("formats PLN in Polish locale", () => {
    expect(nbsp(formatPrice(12.99))).toBe("12,99 zł")
    expect(nbsp(formatPrice(1234.5))).toBe("1234,50 zł")
  })
})

describe("unitPrice", () => {
  it("computes price per litre and per kilogram", () => {
    expect(nbsp(unitPrice(15, { quantity: 1500, unit: "ml" })!.label)).toBe("10,00 zł / l")
    expect(nbsp(unitPrice(5, { quantity: 250, unit: "g" })!.label)).toBe("20,00 zł / kg")
  })
  it("computes price per wash for detergents", () => {
    expect(nbsp(unitPrice(40, { quantity: 50, unit: "pranie" })!.label)).toBe("0,80 zł / pranie")
  })
  it("returns null without measurement data instead of guessing", () => {
    expect(unitPrice(10, null)).toBeNull()
    expect(unitPrice(10, { quantity: 0, unit: "g" })).toBeNull()
  })
})
