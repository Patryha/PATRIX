import { describe, expect, it } from "vitest"
import { parseBlogBody, parseInline, readingMinutes } from "@/lib/blog-markup"

describe("parseBlogBody", () => {
  it("splits headings, paragraphs and lists", () => {
    const blocks = parseBlogBody("## Wstęp\nPierwsza linia\ndruga linia\n\n- jeden\n- **dwa**\n\n### Koniec")
    expect(blocks).toEqual([
      { type: "heading", level: 2, content: [{ type: "text", text: "Wstęp" }] },
      { type: "paragraph", lines: [[{ type: "text", text: "Pierwsza linia" }], [{ type: "text", text: "druga linia" }]] },
      { type: "list", items: [[{ type: "text", text: "jeden" }], [{ type: "strong", text: "dwa" }]] },
      { type: "heading", level: 3, content: [{ type: "text", text: "Koniec" }] },
    ])
  })

  it("keeps a paragraph and a list in one chunk in order", () => {
    expect(parseBlogBody("Lista:\n- a\n- b\nPo liście").map((b) => b.type)).toEqual(["paragraph", "list", "paragraph"])
  })

  it("treats HTML as plain text", () => {
    expect(parseBlogBody("<script>alert(1)</script>")).toEqual([{ type: "paragraph", lines: [[{ type: "text", text: "<script>alert(1)</script>" }]] }])
  })
})

describe("parseInline", () => {
  it("renders shop and https links, drops unsafe ones to text", () => {
    expect(parseInline("Zobacz [krem](/produkt/krem), [źródło](https://example.com) i [zły](javascript:alert)")).toEqual([
      { type: "text", text: "Zobacz " },
      { type: "link", text: "krem", href: "/produkt/krem" },
      { type: "text", text: ", " },
      { type: "link", text: "źródło", href: "https://example.com" },
      { type: "text", text: " i " },
      { type: "text", text: "zły" },
    ])
    expect(parseInline("[x](//evil.example)")).toEqual([{ type: "text", text: "x" }])
  })
})

describe("readingMinutes", () => {
  it("rounds at about 200 words per minute, at least one", () => {
    expect(readingMinutes("krótko")).toBe(1)
    expect(readingMinutes(Array(600).fill("słowo").join(" "))).toBe(3)
  })
})
