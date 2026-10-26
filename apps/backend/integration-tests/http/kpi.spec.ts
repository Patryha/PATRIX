import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../src/modules/patrix-security"
import { bearer, createStaff, login } from "../utils/staff"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const errorOf = (p: Promise<unknown>) => p.then(() => null).catch((e: any) => e.response)
    let owner: { headers: Record<string, string> }
    let warehouse: { headers: Record<string, string> }
    let marketing: { headers: Record<string, string> }

    beforeEach(async () => {
      await getContainer().resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).syncSystemRoles()
      await createStaff(getContainer(), "wlasciciel@patrix.test", ["owner"])
      await createStaff(getContainer(), "magazyn@patrix.test", ["warehouse"])
      await createStaff(getContainer(), "marketing@patrix.test", ["marketing"])
      owner = bearer((await login(api, "wlasciciel@patrix.test")).token)
      warehouse = bearer((await login(api, "magazyn@patrix.test")).token)
      marketing = bearer((await login(api, "marketing@patrix.test")).token)

      // Zamówienia testowe bezpośrednio w module (bez płatności i koszyka)
      const orders = getContainer().resolve(Modules.ORDER)
      const item = (product_id: string, quantity: number, unit_price: number) => ({ title: `TEST ${product_id}`, product_id, quantity, unit_price })
      await orders.createOrders([
        { email: "a@example.test", currency_code: "pln", status: "pending", items: [item("prod_a", 2, 10)] },
        { email: "b@example.test", currency_code: "pln", status: "pending", items: [item("prod_b", 5, 4), item("prod_a", 1, 10)] },
        { email: "c@example.test", currency_code: "pln", status: "canceled", items: [item("prod_c", 9, 100)] },
      ])

      // Pozycja magazynowa z niskim stanem
      const inventory = getContainer().resolve(Modules.INVENTORY)
      const stock = getContainer().resolve(Modules.STOCK_LOCATION)
      const location = await stock.createStockLocations({ name: "TEST magazyn" })
      const [low] = await inventory.createInventoryItems([{ sku: "TEST-NISKI", title: "TEST niski stan" }])
      await inventory.createInventoryLevels([{ inventory_item_id: low.id, location_id: location.id, stocked_quantity: 2 }])
    })

    it("owner sees sales, revenue, top products and low stock", async () => {
      const { data } = await api.get("/admin/patrix/kpi?days=7", owner)
      expect(data.days).toBe(7)
      expect(data.can_see_money).toBe(true)
      expect(data.orders.current).toBe(2)
      expect(data.revenue.current).toBe(50)
      expect(data.average_order_value.current).toBe(25)
      expect(data.daily).toHaveLength(7)
      expect(data.top_products[0]).toMatchObject({ product_id: "prod_b", quantity: 5 })
      expect(data.awaiting_fulfillment).toBe(2)
      expect(data.low_stock.items.map((i: { sku: string }) => i.sku)).toContain("TEST-NISKI")
    })

    it("warehouse sees counts without money; marketing has no access", async () => {
      const { data } = await api.get("/admin/patrix/kpi", warehouse)
      expect(data.days).toBe(30)
      expect(data.can_see_money).toBe(false)
      expect(data.orders.current).toBe(2)
      expect(data.revenue).toBeNull()
      expect(data.average_order_value).toBeNull()
      expect(data.daily.every((d: { revenue: unknown }) => d.revenue === null)).toBe(true)
      expect((await errorOf(api.get("/admin/patrix/kpi", marketing))).status).toBe(403)
    })
  },
})
