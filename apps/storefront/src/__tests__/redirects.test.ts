import { describe, expect, it } from "vitest"
import { buildRedirectMap, normalizeRequestPath } from "@/lib/redirects"

describe("redirects", () => {
  it("normalizes trailing slashes and ignores unsafe targets", () => {
    expect(normalizeRequestPath("/stary/")).toBe("/stary")
    expect(normalizeRequestPath("/")).toBe("/")
    const map = buildRedirectMap([
      { from: "/a/", to: "/b", permanent: true },
      { from: "/x", to: "//evil.example", permanent: true },
      { from: "/y", to: "https://evil.example", permanent: false },
    ])
    expect([...map.entries()]).toEqual([["/a", { to: "/b", permanent: true }]])
  })
})
