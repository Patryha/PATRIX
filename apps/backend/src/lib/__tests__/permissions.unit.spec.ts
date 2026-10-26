import { readdirSync } from "fs"
import { join, relative, sep } from "path"
import { hasPermission, isValidPermission, requiredPermission, SYSTEM_ROLES } from "../permissions"

describe("hasPermission", () => {
  it("grants everything to the wildcard", () => {
    expect(hasPermission(["*"], "order:delete")).toBe(true)
  })
  it("supports resource wildcards", () => {
    expect(hasPermission(["order:*"], "order:delete")).toBe(true)
    expect(hasPermission(["order:*"], "customer:read")).toBe(false)
  })
  it("denies when nothing is granted", () => {
    expect(hasPermission([], "panel:read")).toBe(false)
  })
})

describe("requiredPermission", () => {
  it.each([
    ["GET", "/admin/products", "product:read"],
    ["POST", "/admin/products/prod_1", "product:write"],
    ["DELETE", "/admin/products/prod_1", "product:delete"],
    ["GET", "/admin/orders?limit=5", "order:read"],
    ["POST", "/admin/orders/order_1/fulfillments", "fulfillment:write"],
    ["GET", "/admin/inventory-items", "inventory:read"],
    ["GET", "/admin/customers", "customer:read"],
    ["GET", "/admin/stores", "panel:read"],
    ["POST", "/admin/stores/store_1", "settings:write"],
    ["GET", "/admin/users/me", "panel:read"],
    ["POST", "/admin/users/user_1", "user:write"],
    ["GET", "/admin/patrix/audit-logs", "audit_log:read"],
    ["POST", "/admin/patrix/users/user_1/roles", "staff_role:write"],
    ["POST", "/admin/api-keys", "integration:write"],
  ])("%s %s -> %s", (method, path, expected) => {
    expect(requiredPermission(method, path)).toBe(expected)
  })

  it("requires full access for unknown admin routes (deny by default)", () => {
    expect(requiredPermission("GET", "/admin/some-new-core-route")).toBe("*")
  })

  it("does not let a prefix match leak into a different resource", () => {
    expect(requiredPermission("GET", "/admin/productsfoo")).toBe("*")
  })
})

// Inwentarz tras PATRIX: każda nowa trasa w src/api/admin/patrix musi tu trafić z jawnie wybranym zasobem.
const PATRIX_ROUTE_RESOURCES: Record<string, string> = {
  "audit-logs": "audit_log",
  blog: "content",
  "blog/[id]": "content",
  brands: "product",
  "brands/[id]": "product",
  "cms/pages/[key]": "content",
  "cms/pages/[key]/draft": "content",
  "cms/pages/[key]/preview": "content",
  "cms/pages/[key]/publish": "content",
  "cms/pages/[key]/versions/[id]/restore": "content",
  "import/compliance": "product",
  "import/costs": "finance",
  integrations: "integration",
  "integrations/[adapter]": "integration",
  "integrations/[adapter]/test": "integration",
  "integrations/logs": "integration",
  "integrations/webhooks": "integration",
  "integrations/webhooks/[id]/retry": "integration",
  kpi: "order",
  me: "panel",
  "products/[id]/compliance": "product",
  "products/[id]/costs": "finance",
  "products/[id]/price-history": "product",
  "products/bulk": "product",
  redirects: "content",
  "redirects/[id]": "content",
  roles: "staff_role",
  "roles/[id]": "staff_role",
  "search/preview": "product",
  "search/synonyms": "product",
  "search/synonyms/[id]": "product",
  "search/terms": "product",
  staff: "staff_role",
  "users/[id]/roles": "staff_role",
  "variants/[id]/cost": "finance",
  "warehouse/batches": "inventory",
  "warehouse/counts": "inventory",
  "warehouse/counts/[id]": "inventory",
  "warehouse/counts/[id]/cancel": "inventory",
  "warehouse/counts/[id]/close": "inventory",
  "warehouse/counts/[id]/lines": "inventory",
  "warehouse/lookup": "inventory",
  "warehouse/movements": "inventory",
  "warehouse/movements/export": "inventory",
  "warehouse/stock": "inventory",
  "warehouse/transfers": "inventory",
  "warehouse/value": "finance",
}

function patrixAdminRoutes(): string[] {
  const root = join(__dirname, "..", "..", "api", "admin", "patrix")
  const found: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(join(dir, entry.name))
      } else if (entry.name === "route.ts") {
        found.push(relative(root, dir).split(sep).join("/"))
      }
    }
  }
  walk(root)
  return found.sort()
}

const samplePath = (route: string) => `/admin/patrix/${route.replace(/\[[^\]]+\]/g, "x_1")}`

describe("PATRIX admin routes", () => {
  it("are all listed in the permission inventory", () => {
    expect(patrixAdminRoutes()).toEqual(Object.keys(PATRIX_ROUTE_RESOURCES).sort())
  })

  it.each(Object.entries(PATRIX_ROUTE_RESOURCES))("%s -> %s for every method", (route, resource) => {
    for (const [method, operation] of [["GET", "read"], ["POST", "write"], ["DELETE", "delete"]]) {
      expect(requiredPermission(method, samplePath(route))).toBe(resource === "panel" ? "panel:read" : `${resource}:${operation}`)
    }
  })

  it("keep purchase prices and stock value out of reach of roles without finance access", () => {
    const financePaths = Object.entries(PATRIX_ROUTE_RESOURCES)
      .filter(([, resource]) => resource === "finance")
      .map(([route]) => samplePath(route))
    for (const handle of ["warehouse", "customer_service", "marketing"]) {
      const role = SYSTEM_ROLES.find((r) => r.handle === handle)!
      for (const path of financePaths) {
        expect(hasPermission(role.permissions, requiredPermission("GET", path))).toBe(false)
      }
    }
  })
})

describe("SYSTEM_ROLES", () => {
  it("only uses valid permissions", () => {
    for (const role of SYSTEM_ROLES) {
      for (const permission of role.permissions) {
        expect(isValidPermission(permission)).toBe(true)
      }
    }
  })
  it("keeps commercial data (finance) away from warehouse, customer service and marketing", () => {
    for (const handle of ["warehouse", "customer_service", "marketing"]) {
      const role = SYSTEM_ROLES.find((r) => r.handle === handle)!
      expect(hasPermission(role.permissions, "finance:read")).toBe(false)
    }
  })
  it("rejects malformed permissions", () => {
    expect(isValidPermission("order")).toBe(false)
    expect(isValidPermission("unknown:read")).toBe(false)
    expect(isValidPermission("order:read:extra")).toBe(false)
  })
})
