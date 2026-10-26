import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { invalidateRecommendations } from "../../src/lib/recommendations-data"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../src/modules/patrix-security"
import { bearer, createStaff, login } from "../utils/staff"

jest.setTimeout(180 * 1000)

// Produkty i zamówienia wyłącznie testowe.
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const errorOf = (p: Promise<unknown>) => p.then(() => null).catch((e: any) => e.response)

    it("recommends products bought together (only pairs from 2+ orders) and similar ones from the key's channel", async () => {
      await getContainer().resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).syncSystemRoles()
      await createStaff(getContainer(), "rek@patrix.test", ["owner"])
      const owner = bearer((await login(api, "rek@patrix.test")).token)

      const { data: sc } = await api.post("/admin/sales-channels", { name: "TEST kanał" }, owner)
      const { data: other } = await api.post("/admin/sales-channels", { name: "TEST inny kanał" }, owner)
      const { data: key } = await api.post("/admin/api-keys", { title: "TEST", type: "publishable" }, owner)
      await api.post(`/admin/api-keys/${key.api_key.id}/sales-channels`, { add: [sc.sales_channel.id] }, owner)
      const store = { headers: { "x-publishable-api-key": key.api_key.token } }
      const { data: laundry } = await api.post("/admin/product-categories", { name: "TEST Pranie", is_active: true }, owner)
      const { data: kitchen } = await api.post("/admin/product-categories", { name: "TEST Kuchnia", is_active: true }, owner)

      const create = async (title: string, category: string, channel: string, publish = true) => {
        const { data } = await api.post(
          "/admin/products",
          { title, status: "draft", categories: [{ id: category }], options: [{ title: "R", values: ["1"] }], variants: [{ title: "1", options: { R: "1" }, prices: [{ amount: 5, currency_code: "pln" }] }] },
          owner
        )
        await api.post(`/admin/sales-channels/${channel}/products`, { add: [data.product.id] }, owner)
        if (publish) {
          await getContainer().resolve(Modules.PRODUCT).updateProducts(data.product.id, { status: "published" })
        }
        return data.product.id as string
      }
      const gel = await create("TEST Żel", laundry.product_category.id, sc.sales_channel.id)
      const powder = await create("TEST Proszek", laundry.product_category.id, sc.sales_channel.id)
      const sponge = await create("TEST Gąbka", kitchen.product_category.id, sc.sales_channel.id)
      const liquid = await create("TEST Płyn", kitchen.product_category.id, sc.sales_channel.id)
      const foreign = await create("TEST Obcy kanał", laundry.product_category.id, other.sales_channel.id)
      const draft = await create("TEST Szkic", laundry.product_category.id, sc.sales_channel.id, false)

      const orders = getContainer().resolve(Modules.ORDER)
      const order = (status: string, ...ids: string[]) => ({
        email: "rek@example.test",
        currency_code: "pln",
        status,
        items: ids.map((product_id) => ({ title: "TEST", product_id, quantity: 1, unit_price: 5 })),
      })
      await orders.createOrders([
        order("pending", gel, sponge, foreign, draft),
        order("completed", gel, sponge, foreign, draft),
        order("pending", gel, liquid),
        order("canceled", gel, liquid),
        order("canceled", gel, liquid),
      ] as any)
      invalidateRecommendations()

      const { data } = await api.get(`/store/patrix/recommendations?product_ids=${gel}`, store)
      // gąbka: 2 zamówienia; płyn: 1 ważne (anulowane się nie liczą); obcy kanał i szkic pominięte
      expect(data.bought_together).toEqual([sponge])
      expect(data.similar).toEqual([powder])

      const cart = await api.get(`/store/patrix/recommendations?product_ids=${sponge},${powder}`, store)
      expect(cart.data).toEqual({ bought_together: [gel], similar: [] })

      expect((await errorOf(api.get("/store/patrix/recommendations?product_ids=", store))).status).toBe(400)
      expect((await errorOf(api.get("/store/patrix/recommendations?product_ids=../../x", store))).status).toBe(400)
    })
  },
})
