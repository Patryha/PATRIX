import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../src/modules/patrix-security"
import { bearer, createStaff, login } from "../utils/staff"

jest.setTimeout(180 * 1000)

// Dane wyłącznie testowe (przykładowy kod GS1), nie są to dane prawdziwych produktów.
const TEST_COMPLIANCE = {
  product_kind: "household_chemical",
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
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const errorOf = (p: Promise<unknown>) => p.then(() => null).catch((e: any) => e.response)
    let owner: { headers: Record<string, string> }
    let marketing: { headers: Record<string, string> }
    let warehouse: { headers: Record<string, string> }

    beforeEach(async () => {
      await getContainer().resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).syncSystemRoles()
      await createStaff(getContainer(), "wl@patrix.test", ["owner"])
      await createStaff(getContainer(), "mk@patrix.test", ["marketing"])
      await createStaff(getContainer(), "mg@patrix.test", ["warehouse"])
      owner = bearer((await login(api, "wl@patrix.test")).token)
      marketing = bearer((await login(api, "mk@patrix.test")).token)
      warehouse = bearer((await login(api, "mg@patrix.test")).token)
    })

    // Kody z prefiksu 200 (użytek wewnętrzny) z poprawną sumą kontrolną; każdy produkt inny.
    let eanSeq = 100
    const nextEan = () => {
      const base = `200000000${String(eanSeq++).padStart(3, "0")}`
      const sum = [...base].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0)
      return `${base}${(10 - (sum % 10)) % 10}`
    }

    async function product(handle: string, sku: string) {
      const { data } = await api.post(
        "/admin/products",
        {
          title: `TEST ${handle}`,
          handle,
          status: "draft",
          images: [{ url: "https://example.test/test.jpg" }],
          options: [{ title: "Pojemność", values: ["1 l"] }],
          variants: [{ title: "1 l", sku, ean: nextEan(), options: { Pojemność: "1 l" }, prices: [{ amount: 19.99, currency_code: "pln" }] }],
        },
        owner
      )
      return data.product
    }

    it("imports product data from CSV: dry run, all-or-nothing, never verifies the label", async () => {
      const a = await product("test-import-a", "TEST-IMP-A")
      await product("test-import-b", "TEST-IMP-B")
      await api.post("/admin/patrix/brands", { name: "TEST Marka", handle: "test-marka" }, owner)

      expect((await errorOf(api.post("/admin/patrix/import/compliance", { csv: "uchwyt;skladniki\nx;y" }, owner))).data.message).toContain("Nieznane kolumny: skladniki")

      const bad = "uchwyt;rodzaj;marka;producent;ufi\ntest-import-a;chemia;test-marka;TEST GmbH;\nnie-ma-takiego;;;;\ntest-import-b;;brak-marki;;zly\n"
      const { data: check } = await api.post("/admin/patrix/import/compliance", { csv: bad }, marketing)
      expect(check.applied).toBe(false)
      expect(check.summary).toMatchObject({ rows: 3, create: 1, errors: 2 })
      expect(check.rows[1].errors).toContain("nie ma produktu o uchwycie „nie-ma-takiego”")
      expect(check.rows[2].errors.join(" ")).toMatch(/nie ma marki „brak-marki”.*ufi_code/)
      const refused = await errorOf(api.post("/admin/patrix/import/compliance", { csv: bad, dry_run: false }, marketing))
      expect(refused.status).toBe(400)
      expect((await api.get(`/admin/patrix/products/${a.id}/compliance`, owner)).data.compliance).toBeNull()

      const good = "Uchwyt;Rodzaj;Marka;Producent;Alergeny\ntest-import-a;chemia;test-marka;TEST GmbH;\ntest-import-b;kosmetyk;;TEST Kosmetik GmbH;mleko | orzechy\n"
      const { data: applied } = await api.post("/admin/patrix/import/compliance", { csv: good, dry_run: false }, marketing)
      expect(applied.summary).toMatchObject({ create: 2, errors: 0 })
      const { data: saved } = await api.get(`/admin/patrix/products/${a.id}/compliance`, owner)
      expect(saved.compliance).toMatchObject({ product_kind: "household_chemical", manufacturer_name: "TEST GmbH", polish_label_verified: false, data_status: "needs_review" })

      const { data: again } = await api.post("/admin/patrix/import/compliance", { csv: good }, marketing)
      expect(again.summary).toMatchObject({ unchanged: 2 })

      const audit = await api.get("/admin/patrix/audit-logs?action=catalog.import_compliance", owner)
      expect(audit.data.audit_logs[0].metadata).toEqual({ create: 2, update: 0, unchanged: 0 })
    })

    it("does not change label data of a published product by import", async () => {
      const p = await product("test-import-pub", "TEST-IMP-PUB")
      await api.post(`/admin/patrix/products/${p.id}/compliance`, TEST_COMPLIANCE, owner)
      await api.post(`/admin/products/${p.id}`, { status: "published" }, owner)
      const { data } = await api.post("/admin/patrix/import/compliance", { csv: "uchwyt;producent\ntest-import-pub;Inny GmbH" }, owner)
      expect(data.rows[0].errors[0]).toContain("produkt jest opublikowany")
    })

    it("imports purchase prices by SKU only with finance access", async () => {
      await product("test-cost-a", "TEST-COST-A")
      const csv = "sku;cena_zakupu;dostawca\nTEST-COST-A;12,50;TEST Hurtownia\n"
      expect((await errorOf(api.post("/admin/patrix/import/costs", { csv }, marketing))).status).toBe(403)
      const { data: missing } = await api.post("/admin/patrix/import/costs", { csv: "sku;cena_zakupu\nNIE-MA;1" }, owner)
      expect(missing.rows[0].errors).toEqual(["nie ma wariantu o SKU „NIE-MA”"])
      const { data } = await api.post("/admin/patrix/import/costs", { csv, dry_run: false }, owner)
      expect(data.summary).toMatchObject({ create: 1 })
      const { data: again } = await api.post("/admin/patrix/import/costs", { csv }, owner)
      expect(again.summary).toMatchObject({ unchanged: 1 })
    })

    it("bulk changes: publish only complete products, assign brand and category", async () => {
      const complete = await product("test-bulk-ok", "TEST-BULK-OK")
      const incomplete = await product("test-bulk-brak", "TEST-BULK-BRAK")
      await api.post(`/admin/patrix/products/${complete.id}/compliance`, TEST_COMPLIANCE, owner)
      const ids = [complete.id, incomplete.id]

      const { data: publish } = await api.post("/admin/patrix/products/bulk", { product_ids: ids, action: "publish" }, owner)
      expect(publish.summary).toEqual({ ok: 1, failed: 1 })
      expect(publish.results.find((r: any) => r.id === incomplete.id).error).toContain("niekompletnymi danymi")
      expect((await api.get(`/admin/products/${complete.id}`, owner)).data.product.status).toBe("published")

      const { data: brand } = await api.post("/admin/patrix/brands", { name: "TEST Masowa", handle: "test-masowa" }, owner)
      await api.post("/admin/patrix/products/bulk", { product_ids: ids, action: "brand", value: brand.brand.id }, owner)
      const { data: c1 } = await api.get(`/admin/patrix/products/${complete.id}/compliance`, owner)
      expect(c1.compliance).toMatchObject({ brand_id: brand.brand.id, polish_label_verified: true })

      const { data: cat } = await api.post("/admin/product-categories", { name: "TEST Kategoria", is_active: true }, owner)
      await api.post("/admin/patrix/products/bulk", { product_ids: ids, action: "category_add", value: cat.product_category.id }, owner)
      const listed = await api.get(`/admin/products?category_id[]=${cat.product_category.id}`, owner)
      expect(listed.data.products).toHaveLength(2)
      await api.post("/admin/patrix/products/bulk", { product_ids: [incomplete.id], action: "category_remove", value: cat.product_category.id }, owner)
      expect((await api.get(`/admin/products?category_id[]=${cat.product_category.id}`, owner)).data.products).toHaveLength(1)

      expect((await errorOf(api.post("/admin/patrix/products/bulk", { product_ids: ids, action: "category_add" }, owner))).status).toBe(400)
      expect((await errorOf(api.post("/admin/patrix/products/bulk", { product_ids: ids, action: "draft" }, warehouse))).status).toBe(403)
    })
  },
})
