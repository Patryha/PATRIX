import { describe, expect, it } from "vitest"
import { buildThemeCss, sanitizeColors } from "@/design-system/theme"
import { brand, darkColors, lightColors } from "@/design-system/tokens"

function luminance(hex: string) {
  const v = hex.replace("#", "")
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe("theme tokens", () => {
  it("keeps the owner's brand palette", () => {
    expect(brand).toEqual({ navy: "#10283F", teal: "#00A99D", warmWhite: "#FAFAF7", orange: "#FF8A3D", graphite: "#263238" })
  })

  it.each([
    ["light", lightColors],
    ["dark", darkColors],
  ] as const)("meets WCAG AA text contrast in %s mode", (_mode, c) => {
    const pairs: [string, string][] = [
      [c.foreground, c.background],
      [c.foreground, c.surface],
      [c.muted, c.background],
      [c["primary-foreground"], c.primary],
      [c["accent-strong"], c.background],
      [c["accent-foreground"], c["accent-strong"]],
      [c["highlight-foreground"], c.highlight],
      [c["highlight-strong"], c.background],
      [c.danger, c.background],
      [c["hero-foreground"], c.hero],
      [c["hero-accent"], c.hero],
    ]
    for (const [fg, bg] of pairs) {
      expect(contrast(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe("buildThemeCss", () => {
  it("emits light, explicit dark and system dark rules", () => {
    const css = buildThemeCss()
    expect(css).toContain(":root{--px-background:#FAFAF7;")
    expect(css).toContain(':root[data-theme="dark"]')
    expect(css).toContain('@media (prefers-color-scheme: dark){:root:not([data-theme="light"])')
  })

  it("applies valid admin overrides", () => {
    expect(buildThemeCss({ light: { primary: "#123456" } })).toContain("--px-primary:#123456;")
  })

  it("drops values that could inject CSS", () => {
    const evil = sanitizeColors({ primary: "red;}body{display:none", accent: "#00f", unknown: "#fff" })
    expect(evil).toEqual({ accent: "#00f" })
    expect(buildThemeCss({ light: { primary: "#fff}</style><script>" } } as never)).not.toContain("<script>")
  })
})
