import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { invalidateSearchIndex } from "../../src/lib/search-index"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../src/modules/patrix-security"
import { bearer, createStaff, login } from "../utils/staff"

jest.setTimeout(180 * 1000)

// Produkty wyłącznie testowe (kody EAN z puli wewnętrznej 200…), nie są to dane prawdziwych produktów.
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const errorOf = (p: Promise<unknown>) => p.then(() => null).catch((e: any) => e.response)
    let owner: { headers: Record<string, string> }
    let store: { headers: Record<string, string> }
    let ids: Record<string, string>

    async function createProduct(title: string, sku: string, ean: string, opts: { channel?: string; publish?: boolean; subtitle?: string } = {}) {
      const { data } = await api.post(
        "/admin/products",
        {
          title,
          subtitle: opts.subtitle,
          status: "draft",
          options: [{ title: "Rozmiar", values: ["1 szt."] }],
          variants: [{ title: "1 szt.", sku, ean, options: { Rozmiar: "1 szt." }, prices: [{ amount: 9.99, currency_code: "pln" }] }],
        },
        owner
      )
      if (opts.channel) {
        await api.post(`/admin/sales-channels/${opts.channel}/products`, { add: [data.product.id] }, owner)
      }
      if (opts.publish !== false) {
        // Publikacja z pominięciem kontroli danych prawnych (sprawdza ją osobny test katalogu).
        await getContainer().resolve(Modules.PRODUCT).updateProducts(data.product.id, { status: "published" })
      }
      return data.product.id as string
    }

    beforeEach(async () => {
      invalidateSearchIndex()
      await getContainer().resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).syncSystemRoles()
      await createStaff(getContainer(), "szukaj@patrix.test", ["owner"])
      owner = bearer((await login(api, "szukaj@patrix.test")).token)

      const { data: sc } = await api.post("/admin/sales-channels", { name: "TEST kanał" }, owner)
      const { data: other } = await api.post("/admin/sales-channels", { name: "TEST inny kanał" }, owner)
      const { data: key } = await api.post("/admin/api-keys", { title: "TEST", type: "publishable" }, owner)
      await api.post(`/admin/api-keys/${key.api_key.id}/sales-channels`, { add: [sc.sales_channel.id] }, owner)
      store = { headers: { "x-publishable-api-key": key.api_key.token } }

      const channel = sc.sales_channel.id
      ids = {
        gel: await createProduct("TEST Żel do prania kolorów", "TEST-ZEL-1", "2000000000011", { channel, subtitle: "Flüssigwaschmittel" }),
        powder: await createProduct("TEST Proszek do prania", "TEST-PRO-1", "2000000000028", { channel }),
        descaler: await createProduct("TEST Odkamieniacz do czajnika", "TEST-ODK-1", "2000000000035", { channel }),
        draft: await createProduct("TEST Żel szkic", "TEST-SZK-1", "2000000000042", { channel, publish: false }),
        elsewhere: await createProduct("TEST Żel inny kanał", "TEST-INN-1", "2000000000059", { channel: other.sales_channel.id }),
      }
      invalidateSearchIndex()
    })

    it("finds products despite missing Polish characters and typos, by EAN and SKU, only published and in the key's channel", async () => {
      const search = async (q: string) => (await api.get(`/store/patrix/search?q=${encodeURIComponent(q)}`, store)).data

      expect((await search("zel do prania")).product_ids).toEqual([ids.gel])
      expect((await search("prosek")).product_ids).toEqual([ids.powder])
      expect((await search("prania")).product_ids).toEqual(expect.arrayContaining([ids.gel, ids.powder]))
      expect((await search("waschmittel")).product_ids).toEqual([ids.gel])
      expect((await search("2000000000035")).product_ids).toEqual([ids.descaler])
      expect((await search("test-pro-1")).product_ids).toEqual([ids.powder])
      // szkic i produkt z innego kanału sprzedaży nie są widoczne
      expect((await search("2000000000042")).product_ids).toEqual([])
      expect((await search("inny kanał")).product_ids).not.toContain(ids.elsewhere)

      const none = await search("kremik")
      expect(none.product_ids).toEqual([])
      expect((await errorOf(api.get("/store/patrix/search?q=", store))).status).toBe(400)
      expect((await errorOf(api.get(`/store/patrix/search?q=${"a".repeat(101)}`, store))).status).toBe(400)

      const { data } = await api.get("/admin/patrix/search/terms?zero=1", owner)
      expect(data.terms.map((t: { term: string }) => t.term)).toEqual(expect.arrayContaining(["kremik"]))
      const all = (await api.get("/admin/patrix/search/terms", owner)).data.terms
      expect(all.find((t: { term: string }) => t.term === "zel do prania")).toMatchObject({ searches: 1, zero_results: 0, last_results: 1 })
    })

    it("applies synonyms managed in the panel; only roles with product access can change them", async () => {
      expect((await api.get("/store/patrix/search?q=entkalker", store)).data.product_ids).toEqual([])

      const bad = await errorOf(api.post("/admin/patrix/search/synonyms", { terms: ["Odkamieniacz", "odkamieniacz"] }, owner))
      expect(bad.status).toBe(400)
      const { data } = await api.post("/admin/patrix/search/synonyms", { terms: ["odkamieniacz", "Entkalker"], note: "nazwa niemiecka" }, owner)
      expect(data.synonym.terms).toEqual(["odkamieniacz", "Entkalker"])
      expect((await api.get("/store/patrix/search?q=entkalker", store)).data.product_ids).toEqual([ids.descaler])

      const { data: preview } = await api.get("/admin/patrix/search/preview?q=entkalker", owner)
      expect(preview.hits[0]).toMatchObject({ id: ids.descaler, title: "TEST Odkamieniacz do czajnika" })

      await createStaff(getContainer(), "mg-szukaj@patrix.test", ["warehouse"])
      const warehouse = bearer((await login(api, "mg-szukaj@patrix.test")).token)
      expect((await errorOf(api.post("/admin/patrix/search/synonyms", { terms: ["a1", "b1"] }, warehouse))).status).toBe(403)

      await api.delete(`/admin/patrix/search/synonyms/${data.synonym.id}`, owner)
      expect((await api.get("/store/patrix/search?q=entkalker", store)).data.product_ids).toEqual([])
    })

    it("suggests products and categories while typing without recording statistics", async () => {
      await api.post("/admin/product-categories", { name: "TEST Pranie", handle: "test-pranie", is_active: true, is_internal: false }, owner)
      invalidateSearchIndex()
      const { data } = await api.get("/store/patrix/search/suggest?q=pra", store)
      expect(data.products.map((p: { id: string }) => p.id)).toEqual(expect.arrayContaining([ids.gel, ids.powder]))
      expect(data.products[0]).toEqual(expect.objectContaining({ title: expect.any(String), handle: expect.any(String) }))
      expect(data.categories).toEqual([{ name: "TEST Pranie", handle: "test-pranie" }])
      expect((await api.get("/admin/patrix/search/terms", owner)).data.terms).toEqual([])
    })
  },
})
