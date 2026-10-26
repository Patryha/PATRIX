import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../src/modules/patrix-security"
import { bearer, createStaff, login } from "../utils/staff"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const errorOf = (p: Promise<unknown>) => p.then(() => null).catch((e: any) => e.response)

    it("manages redirects with validation and permissions and publishes them to the store", async () => {
      await getContainer().resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).syncSystemRoles()
      await createStaff(getContainer(), "seo-mk@patrix.test", ["marketing"])
      await createStaff(getContainer(), "seo-mg@patrix.test", ["warehouse"])
      const marketing = bearer((await login(api, "seo-mk@patrix.test")).token)
      const warehouse = bearer((await login(api, "seo-mg@patrix.test")).token)
      await createStaff(getContainer(), "seo-wl@patrix.test", ["owner"])
      const owner = bearer((await login(api, "seo-wl@patrix.test")).token)
      const { data: key } = await api.post("/admin/api-keys", { title: "TEST", type: "publishable" }, owner)
      const store = { headers: { "x-publishable-api-key": key.api_key.token } }

      const { data } = await api.post("/admin/patrix/redirects", { from_path: "/stary-sklep/krem.html/", to_path: "/produkt/krem", note: "stary sklep" }, marketing)
      expect(data.redirect).toMatchObject({ from_path: "/stary-sklep/krem.html", to_path: "/produkt/krem", permanent: true })

      expect((await errorOf(api.post("/admin/patrix/redirects", { from_path: "/x", to_path: "https://evil.example" }, marketing))).status).toBe(400)
      expect((await errorOf(api.post("/admin/patrix/redirects", { from_path: "/stary-sklep/krem.html", to_path: "/inny" }, marketing))).status).toBe(400)
      const chain = await errorOf(api.post("/admin/patrix/redirects", { from_path: "/y", to_path: "/stary-sklep/krem.html" }, marketing))
      expect(chain.data.message).toContain("łańcucha")
      expect((await errorOf(api.post("/admin/patrix/redirects", { from_path: "/z", to_path: "/q" }, warehouse))).status).toBe(403)

      const { data: updated } = await api.post(`/admin/patrix/redirects/${data.redirect.id}`, { from_path: "/stary-sklep/krem.html", to_path: "/produkt/krem-nowy", permanent: false }, marketing)
      expect(updated.redirect).toMatchObject({ to_path: "/produkt/krem-nowy", permanent: false })

      const { data: published } = await api.get("/store/patrix/redirects", store)
      expect(published.redirects).toEqual([{ from: "/stary-sklep/krem.html", to: "/produkt/krem-nowy", permanent: false }])

      await api.delete(`/admin/patrix/redirects/${data.redirect.id}`, marketing)
      expect((await api.get("/store/patrix/redirects", store)).data.redirects).toEqual([])
    })
  },
})
