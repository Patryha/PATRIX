import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../src/modules/patrix-security"
import { bearer, createStaff, login } from "../utils/staff"

jest.setTimeout(180 * 1000)

const CONTENT = {
  sections: [
    { id: "hero1", type: "hero_slider", slides: [{ title: "Witamy", cta_label: "Zobacz", cta_href: "/kategoria/promocje" }] },
    { id: "rail1", type: "product_rail", title: "Nowości", source: "newest", limit: 8 },
  ],
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const errorOf = (p: Promise<unknown>) => p.then(() => null).catch((e: any) => e.response)
    let marketing: { headers: Record<string, string> }
    let warehouse: { headers: Record<string, string> }
    let store: { headers: Record<string, string> }

    beforeEach(async () => {
      await getContainer().resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).syncSystemRoles()
      await createStaff(getContainer(), "wlasciciel@patrix.test", ["owner"])
      await createStaff(getContainer(), "marketing@patrix.test", ["marketing"])
      await createStaff(getContainer(), "magazyn@patrix.test", ["warehouse"])
      const owner = bearer((await login(api, "wlasciciel@patrix.test")).token)
      marketing = bearer((await login(api, "marketing@patrix.test")).token)
      warehouse = bearer((await login(api, "magazyn@patrix.test")).token)
      const { data: key } = await api.post("/admin/api-keys", { title: "TEST", type: "publishable" }, owner)
      store = { headers: { "x-publishable-api-key": key.api_key.token } }
    })

    it("draft → preview → publish → archive, store sees only the published version", async () => {
      expect((await errorOf(api.get("/store/patrix/cms/pages/home", store))).status).toBe(404)

      const { data: saved } = await api.post("/admin/patrix/cms/pages/home/draft", { content: CONTENT, note: "Pierwsza" }, marketing)
      expect(saved.draft.status).toBe("draft")
      expect(saved.draft.version).toBe(1)

      const { data: preview } = await api.post("/admin/patrix/cms/pages/home/preview", {}, marketing)
      const token = new URL(preview.url).searchParams.get("token")!
      const { data: draftView } = await api.get(`/store/patrix/cms/preview?token=${token}`, store)
      expect(draftView.page.content.sections).toHaveLength(2)
      expect((await errorOf(api.get("/store/patrix/cms/preview?token=zly-token-zly-token-zly", store))).status).toBe(404)

      await api.post("/admin/patrix/cms/pages/home/publish", {}, marketing)
      const { data: live } = await api.get("/store/patrix/cms/pages/home", store)
      expect(live.page.version).toBe(1)
      // Po publikacji token podglądu przestaje działać
      expect((await errorOf(api.get(`/store/patrix/cms/preview?token=${token}`, store))).status).toBe(404)

      // Druga wersja: zmiana kolejności, publikacja archiwizuje pierwszą
      await api.post("/admin/patrix/cms/pages/home/draft", { content: { sections: [...CONTENT.sections].reverse() } }, marketing)
      const { data: beforePublish } = await api.get("/store/patrix/cms/pages/home", store)
      expect(beforePublish.page.content.sections[0].id).toBe("hero1")
      await api.post("/admin/patrix/cms/pages/home/publish", {}, marketing)
      const { data: after } = await api.get("/store/patrix/cms/pages/home", store)
      expect(after.page.content.sections[0].id).toBe("rail1")

      const { data: page } = await api.get("/admin/patrix/cms/pages/home", marketing)
      expect(page.history.map((h: { status: string }) => h.status)).toEqual(["published", "archived"])
      expect(JSON.stringify(page)).not.toContain("preview_token_hash")

      // Przywrócenie wersji 1 tworzy szkic z jej treścią
      const v1 = page.history.find((h: { version: number }) => h.version === 1)
      const { data: restored } = await api.post(`/admin/patrix/cms/pages/home/versions/${v1.id}/restore`, {}, marketing)
      expect(restored.draft.content.sections[0].id).toBe("hero1")
      expect(restored.draft.version).toBe(3)
    })

    it("rejects invalid content and unsafe links", async () => {
      const bad = await errorOf(
        api.post(
          "/admin/patrix/cms/pages/home/draft",
          { content: { sections: [{ id: "hero1", type: "hero_slider", slides: [{ title: "X", cta_label: "Kup", cta_href: "javascript:alert(1)" }] }] } },
          marketing
        )
      )
      expect(bad.status).toBe(400)
      expect((await errorOf(api.post("/admin/patrix/cms/pages/home/draft", { content: CONTENT, extra: 1 }, marketing))).status).toBe(400)
      expect((await errorOf(api.post("/admin/patrix/cms/pages/kontakt/draft", { content: CONTENT }, marketing))).status).toBe(404)
      expect((await errorOf(api.post("/admin/patrix/cms/pages/home/publish", {}, marketing))).status).toBe(404)
    })

    it("menu and footer (layout page): own schema, publish, preview", async () => {
      const layout = {
        menu: { items: [{ category_handle: "srodki-do-prania", image_url: "https://example.test/pranie.jpg", image_alt: "Środki do prania" }] },
        footer: { columns: [{ title: "Zakupy", links: [{ label: "Wyszukiwarka", href: "/szukaj" }] }], contact: { email: "kontakt@example.test" } },
      }
      // Treść strony głównej nie przechodzi schematu menu i stopki
      expect((await errorOf(api.post("/admin/patrix/cms/pages/layout/draft", { content: CONTENT }, marketing))).status).toBe(400)
      const noAlt = { ...layout, menu: { items: [{ category_handle: "srodki-do-prania", image_url: "https://example.test/p.jpg" }] } }
      const missingAlt = await errorOf(api.post("/admin/patrix/cms/pages/layout/draft", { content: noAlt }, marketing))
      expect(missingAlt.status).toBe(400)
      expect(missingAlt.data.message).toContain("menu.items.0.image_alt")
      const badPhone = { ...layout, footer: { ...layout.footer, contact: { phone: "zadzwoń" } } }
      expect((await errorOf(api.post("/admin/patrix/cms/pages/layout/draft", { content: badPhone }, marketing))).status).toBe(400)

      await api.post("/admin/patrix/cms/pages/layout/draft", { content: layout }, marketing)
      const { data: preview } = await api.post("/admin/patrix/cms/pages/layout/preview", {}, marketing)
      const token = new URL(preview.url).searchParams.get("token")
      const { data: draft } = await api.get(`/store/patrix/cms/preview?token=${token}`, store)
      expect(draft.page.page_key).toBe("layout")

      await api.post("/admin/patrix/cms/pages/layout/publish", {}, marketing)
      const { data } = await api.get("/store/patrix/cms/pages/layout", store)
      expect(data.page.content.footer.contact.email).toBe("kontakt@example.test")
      expect(data.page.content.menu.items).toHaveLength(1)
    })

    it("denies staff without the content permission", async () => {
      expect((await errorOf(api.get("/admin/patrix/cms/pages/home", warehouse))).status).toBe(403)
      expect((await errorOf(api.post("/admin/patrix/cms/pages/home/draft", { content: CONTENT }, warehouse))).status).toBe(403)
    })
  },
})
