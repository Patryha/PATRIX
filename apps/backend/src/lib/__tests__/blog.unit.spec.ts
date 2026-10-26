import { blogBodyIssues, slugify } from "../../modules/patrix-cms/blog"

describe("blog", () => {
  it("accepts shop paths and https links, rejects other schemes and empty labels", () => {
    expect(blogBodyIssues("Zobacz [krem](/produkt/krem) i [źródło](https://example.com/a).")).toEqual([])
    expect(blogBodyIssues("[klik](javascript:alert(1))")).toHaveLength(1)
    expect(blogBodyIssues("[klik](http://example.com)")).toHaveLength(1)
    expect(blogBodyIssues("[klik](//evil.example)")).toHaveLength(1)
    expect(blogBodyIssues("[](/produkt/krem)")).toEqual(["Link /produkt/krem nie ma tekstu."])
  })

  it("builds slugs without Polish and German characters", () => {
    expect(slugify("Jak prać wełnę? Ściągawka (Waschmittel für Wolle)")).toBe("jak-prac-welne-sciagawka-waschmittel-fur-wolle")
    expect(slugify("Łódź & Straße")).toBe("lodz-strasse")
    expect(slugify("  ---  ")).toBe("")
  })
})
