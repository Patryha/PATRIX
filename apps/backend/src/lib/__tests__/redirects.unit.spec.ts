import { normalizePath, validateRedirect } from "../redirects"

describe("normalizePath", () => {
  it("accepts shop paths and normalizes them", () => {
    expect(normalizePath(" /produkt/stary/ ")).toBe("/produkt/stary")
    expect(normalizePath("/stara-strona.html?ref=x#a")).toBe("/stara-strona.html")
    expect(normalizePath("/")).toBe("/")
  })

  it("rejects external and malformed targets", () => {
    for (const bad of ["https://evil.example", "//evil.example", "produkt", "/a b", "/\\evil", "javascript:alert(1)"]) {
      expect(normalizePath(bad)).toBeNull()
    }
  })
})

describe("validateRedirect", () => {
  const existing = [{ id: "r1", from_path: "/a", to_path: "/b" }]
  it("blocks self, panel, duplicates, chains and loops", () => {
    expect(validateRedirect({ from_path: "/x", to_path: "/x" }, existing)).toContain("inny")
    expect(validateRedirect({ from_path: "/app/login", to_path: "/x" }, existing)).toContain("panelu")
    expect(validateRedirect({ from_path: "/a", to_path: "/c" }, existing)).toContain("istnieje")
    expect(validateRedirect({ from_path: "/c", to_path: "/a" }, existing)).toContain("łańcucha")
    expect(validateRedirect({ from_path: "/b", to_path: "/c" }, existing)).toContain("Na ten adres")
    expect(validateRedirect({ id: "r1", from_path: "/a", to_path: "/c" }, existing)).toBeNull()
    expect(validateRedirect({ from_path: "/c", to_path: "/d" }, existing)).toBeNull()
  })
})
