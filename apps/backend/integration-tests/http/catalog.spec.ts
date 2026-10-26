import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../src/modules/patrix-security"
import { bearer, createStaff, login } from "../utils/staff"

jest.setTimeout(180 * 1000)

// Dane wyłącznie testowe (przykładowy kod GS1 5901234123457), nie są to dane prawdziwego produktu.
const TEST_COMPLIANCE = {
  product_kind: "household_chemical",
  name_original: "TEST Reiniger",
  manufacturer_name: "TEST Hersteller GmbH",
  manufacturer_address: "Teststraße 1, 10115 Berlin, DE",
  manufacturer_contact: "kontakt@example.test",
  manufacturer_in_eu: true,
  net_quantity: 1,
  net_quantity_unit: "l",
  ingredients: "TEST: skład wyłącznie do testów automatycznych",
  allergens_confirmed: false,
  clp_signal_word: "warning",
  clp_hazard_statements: ["H319"],
  clp_pictograms: ["GHS07"],
  ufi_code: "TEST-0000-0000-0001",
  polish_label_verified: true,
  internal_notes: "notatka wewnętrzna",
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const errorOf = (p: Promise<unknown>) => p.then(() => null).catch((e: any) => e.response)
    let owner: { headers: Record<string, string> }

    beforeEach(async () => {
      await getContainer().resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).syncSystemRoles()
      await createStaff(getContainer(), "katalog@patrix.test", ["owner"])
      owner = bearer((await login(api, "katalog@patrix.test")).token)
    })

    async function createDraftProduct() {
      const { data } = await api.post(
        "/admin/products",
        {
          title: "TEST Płyn czyszczący",
          status: "draft",
          images: [{ url: "https://example.test/test.jpg" }],
          options: [{ title: "Pojemność", values: ["1 l"] }],
          variants: [
            { title: "1 l", sku: "TEST-SKU-1", ean: "5901234123457", options: { Pojemność: "1 l" }, prices: [{ amount: 19.99, currency_code: "pln" }] },
          ],
        },
        owner
      )
      return data.product
    }

    it("blocks publishing until the legal data is complete", async () => {
      const product = await createDraftProduct()

      const blocked = await errorOf(api.post(`/admin/products/${product.id}`, { status: "published" }, owner))
      expect(blocked.status).toBe(400)
      expect(blocked.data.message).toContain("niekompletnymi danymi")

      const { data: before } = await api.get(`/admin/patrix/products/${product.id}/compliance`, owner)
      expect(before.report.complete).toBe(false)
      expect(before.report.missing.map((m: { field: string }) => m.field)).toContain("manufacturer_name")

      const { data: saved } = await api.post(`/admin/patrix/products/${product.id}/compliance`, TEST_COMPLIANCE, owner)
      expect(saved.report).toEqual(expect.objectContaining({ complete: true }))
      expect(saved.compliance.data_status).toBe("verified")
      expect(saved.compliance.reviewed_at).toBeTruthy()

      const { data: published } = await api.post(`/admin/products/${product.id}`, { status: "published" }, owner)
      expect(published.product.status).toBe("published")
    })

    it("shows only verified public data in the store API", async () => {
      const { data: sc } = await api.post("/admin/sales-channels", { name: "TEST kanał" }, owner)
      const { data: key } = await api.post("/admin/api-keys", { title: "TEST", type: "publishable" }, owner)
      await api.post(`/admin/api-keys/${key.api_key.id}/sales-channels`, { add: [sc.sales_channel.id] }, owner)
      const store = { headers: { "x-publishable-api-key": key.api_key.token } }

      const product = await createDraftProduct()
      await api.post(`/admin/sales-channels/${sc.sales_channel.id}/products`, { add: [product.id] }, owner)
      // szkic nie jest widoczny w sklepie
      expect((await errorOf(api.get(`/store/patrix/products/${product.id}/details`, store))).status).toBe(404)

      await api.post(`/admin/patrix/products/${product.id}/compliance`, TEST_COMPLIANCE, owner)
      await api.post(`/admin/products/${product.id}`, { status: "published" }, owner)
      const { data } = await api.get(`/store/patrix/products/${product.id}/details`, store)
      expect(data.compliance.manufacturer_name).toBe("TEST Hersteller GmbH")
      expect(data.compliance.internal_notes).toBeUndefined()
      expect(data.compliance.reviewed_by).toBeUndefined()
      expect(data.omnibus).toHaveLength(1)
    })

    it("rejects invalid UFI and unknown fields", async () => {
      const product = await createDraftProduct()
      const bad = await errorOf(
        api.post(`/admin/patrix/products/${product.id}/compliance`, { ...TEST_COMPLIANCE, ufi_code: "zly" }, owner)
      )
      expect(bad.status).toBe(400)
      const extra = await errorOf(
        api.post(`/admin/patrix/products/${product.id}/compliance`, { ...TEST_COMPLIANCE, data_status: "verified" }, owner)
      )
      expect(extra.status).toBe(400)
    })

    it("hides purchase prices from roles without finance access", async () => {
      const product = await createDraftProduct()
      const variantId = product.variants[0].id
      await api.post(`/admin/patrix/variants/${variantId}/cost`, { purchase_price: 7.5, supplier: "TEST" }, owner)
      const { data } = await api.get(`/admin/patrix/products/${product.id}/costs`, owner)
      expect(data.variants[0].purchase_price_net).toBe(7.5)

      await createStaff(getContainer(), "marketing@patrix.test", ["marketing"])
      const marketing = bearer((await login(api, "marketing@patrix.test")).token)
      expect((await errorOf(api.get(`/admin/patrix/products/${product.id}/costs`, marketing))).status).toBe(403)
      expect((await errorOf(api.post(`/admin/patrix/variants/${variantId}/cost`, { purchase_price: 1 }, marketing))).status).toBe(403)
    })

    it("manages brands and refuses to delete a brand in use", async () => {
      const { data } = await api.post("/admin/patrix/brands", { name: "TEST Marka", handle: "test-marka", country_code: "de" }, owner)
      const product = await createDraftProduct()
      await api.post(`/admin/patrix/products/${product.id}/compliance`, { ...TEST_COMPLIANCE, brand_id: data.brand.id }, owner)
      const conflict = await errorOf(api.delete(`/admin/patrix/brands/${data.brand.id}`, owner))
      expect(conflict.status).toBe(409)
      const dup = await errorOf(api.post("/admin/patrix/brands", { name: "Inna", handle: "test-marka" }, owner))
      expect(dup.status).toBeGreaterThanOrEqual(400)
    })

    it("records price history when a product is created", async () => {
      await api.post("/admin/regions", { name: "TEST Polska", currency_code: "pln", countries: ["pl"] }, owner)
      const product = await createDraftProduct()
      // subskrybent działa asynchronicznie
      let entries: unknown[] = []
      // przy pełnym zestawie testów subskrybent bywa wolniejszy, więc czekamy do 15 s
      for (let i = 0; i < 60 && !entries.length; i++) {
        await new Promise((r) => setTimeout(r, 250))
        entries = (await api.get(`/admin/patrix/products/${product.id}/price-history`, owner)).data.entries
      }
      expect(entries).toEqual([expect.objectContaining({ currency_code: "pln", amount: 19.99 })])
    })
  },
})
