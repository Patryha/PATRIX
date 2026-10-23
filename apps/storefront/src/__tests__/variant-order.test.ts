import { describe, expect, it } from "vitest"
import { sortVariants } from "../lib/variant-order"

describe("sortVariants", () => {
  it("sortuje po kolejności z panelu, potem liczbowo po nazwie", () => {
    const sorted = sortVariants([
      { title: "2 l", variant_rank: 0 },
      { title: "1000 g", variant_rank: 0 },
      { title: "1 l", variant_rank: 0 },
      { title: "200 g", variant_rank: 0 },
      { title: "Zestaw", variant_rank: -1 },
    ])
    expect(sorted.map((v) => v.title)).toEqual(["Zestaw", "1 l", "2 l", "200 g", "1000 g"])
  })
})
