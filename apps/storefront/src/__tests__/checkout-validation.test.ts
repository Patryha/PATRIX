import { describe, expect, it } from "vitest"
import { AddressSchema, fieldErrors, isValidNip } from "@/lib/validation/checkout"

const valid = {
  email: "Jan@Example.test",
  first_name: "Jan",
  last_name: "Kowalski",
  phone: "600 700 800",
  address_1: "ul. Testowa 1",
  postal_code: "00-950",
  city: "Warszawa",
}

describe("isValidNip", () => {
  it("accepts a correct checksum with separators and PL prefix", () => {
    expect(isValidNip("123-456-32-18")).toBe(true)
    expect(isValidNip("PL1234563218")).toBe(true)
  })
  it("rejects wrong checksum and length", () => {
    expect(isValidNip("1234563219")).toBe(false)
    expect(isValidNip("123456321")).toBe(false)
  })
})

describe("AddressSchema", () => {
  it("normalizes e-mail and accepts a Polish address", () => {
    const r = AddressSchema.parse(valid)
    expect(r.email).toBe("jan@example.test")
  })
  it("reports Polish messages per field", () => {
    const r = AddressSchema.safeParse({ ...valid, postal_code: "00950", email: "x" })
    expect(r.success).toBe(false)
    const errors = fieldErrors(r.error!)
    expect(errors.postal_code).toBe("Kod pocztowy w formacie 00-000.")
    expect(errors.email).toBe("Podaj prawidłowy adres e-mail.")
  })
  it("requires company and a valid NIP for an invoice", () => {
    const r = AddressSchema.safeParse({ ...valid, invoice: "on", nip: "1234563219" })
    const errors = fieldErrors(r.error!)
    expect(errors.company).toBeDefined()
    expect(errors.nip).toBe("Podaj prawidłowy NIP (10 cyfr).")
    expect(AddressSchema.safeParse({ ...valid, invoice: "on", company: "Firma", nip: "1234563218" }).success).toBe(true)
  })
})
