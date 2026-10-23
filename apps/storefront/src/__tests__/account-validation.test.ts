import { describe, expect, it } from "vitest"
import { RegisterSchema, safeRedirect } from "../lib/validation/account"

describe("rejestracja", () => {
  const ok = { email: " Jan@Example.TEST ", first_name: "Jan", last_name: "Testowy", password: "dobrehaslo1", terms: "on" }

  it("normalizuje e-mail i przyjmuje poprawne dane", () => {
    const r = RegisterSchema.safeParse(ok)
    expect(r.success && r.data.email).toBe("jan@example.test")
  })

  it("wymaga silnego hasła i akceptacji regulaminu", () => {
    expect(RegisterSchema.safeParse({ ...ok, password: "krotkie1" }).success).toBe(false)
    expect(RegisterSchema.safeParse({ ...ok, password: "bezcyfrbezcyfr" }).success).toBe(false)
    expect(RegisterSchema.safeParse({ ...ok, terms: undefined }).success).toBe(false)
  })
})

describe("safeRedirect", () => {
  it("przepuszcza tylko ścieżki lokalne", () => {
    expect(safeRedirect("/zamowienie")).toBe("/zamowienie")
    expect(safeRedirect("//evil.example")).toBe("/konto")
    expect(safeRedirect("/\\evil.example")).toBe("/konto")
    expect(safeRedirect("https://evil.example")).toBe("/konto")
    expect(safeRedirect(null)).toBe("/konto")
  })
})
