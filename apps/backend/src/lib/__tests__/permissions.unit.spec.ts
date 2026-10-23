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
