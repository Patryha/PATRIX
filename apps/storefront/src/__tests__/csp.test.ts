import { describe, expect, it } from "vitest"
import { buildCsp } from "@/lib/csp"

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `) || d === name)

describe("buildCsp", () => {
  it("allows only own origin without configured tools", () => {
    const csp = buildCsp({ dev: false, https: true, ga4: false, metaPixel: false })
    expect(directive(csp, "default-src")).toBe("default-src 'self'")
    expect(directive(csp, "script-src")).toBe("script-src 'self' 'unsafe-inline'")
    expect(directive(csp, "connect-src")).toBe("connect-src 'self'")
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'")
    expect(directive(csp, "object-src")).toBe("object-src 'none'")
    expect(directive(csp, "upgrade-insecure-requests")).toBeDefined()
    expect(csp).not.toContain("google")
    expect(csp).not.toContain("facebook")
    expect(csp).not.toContain("unsafe-eval")
  })

  it("adds analytics origins only for configured tools", () => {
    const ga = buildCsp({ dev: false, https: true, ga4: true, metaPixel: false })
    expect(directive(ga, "script-src")).toContain("https://www.googletagmanager.com")
    expect(directive(ga, "connect-src")).toContain("https://*.google-analytics.com")
    expect(ga).not.toContain("facebook")
    const meta = buildCsp({ dev: false, https: true, ga4: false, metaPixel: true })
    expect(directive(meta, "script-src")).toContain("https://connect.facebook.net")
    expect(directive(meta, "img-src")).toContain("https://www.facebook.com")
    expect(meta).not.toContain("google")
  })

  it("relaxes only what development needs and skips the https upgrade on http", () => {
    const csp = buildCsp({ dev: true, https: false, ga4: false, metaPixel: false })
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'")
    expect(directive(csp, "connect-src")).toContain("ws:")
    expect(directive(csp, "upgrade-insecure-requests")).toBeUndefined()
  })
})
