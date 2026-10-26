import { describe, expect, it } from "vitest"
import { FAVORITES_MAX, mergeFavorites, parseFavoritesCookie, sanitizeFavorites, toggleHandle } from "@/lib/favorites-list"

describe("ulubione", () => {
  it("odrzuca błędne wpisy i duplikaty z niezaufanych danych", () => {
    expect(sanitizeFavorites(["a-1", "a-1", "../x", "<b>", 5, null, "B", "ok"])).toEqual(["a-1", "ok"])
    expect(sanitizeFavorites("a-1")).toEqual([])
    expect(parseFavoritesCookie("nie-json")).toEqual([])
    expect(parseFavoritesCookie(undefined)).toEqual([])
    expect(parseFavoritesCookie('["x","y"]')).toEqual(["x", "y"])
  })

  it("przełącza produkt i dodaje nowy na początek z limitem", () => {
    expect(toggleHandle(["a"], "b")).toEqual({ list: ["b", "a"], favorite: true })
    expect(toggleHandle(["b", "a"], "b")).toEqual({ list: ["a"], favorite: false })
    const full = Array.from({ length: FAVORITES_MAX }, (_, i) => `p-${i}`)
    const { list } = toggleHandle(full, "nowy")
    expect(list).toHaveLength(FAVORITES_MAX)
    expect(list[0]).toBe("nowy")
  })

  it("łączy ulubione gościa z kontem bez duplikatów, konto pierwsze", () => {
    expect(mergeFavorites(["a", "b"], ["c", "a"])).toEqual(["a", "b", "c"])
  })
})
