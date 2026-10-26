import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../src/modules/patrix-security"
import { bearer, createStaff, login } from "../utils/staff"

jest.setTimeout(180 * 1000)

// Wpisy wyłącznie testowe.
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const errorOf = (p: Promise<unknown>) => p.then(() => null).catch((e: any) => e.response)

    it("lets content roles write posts and publishes only published posts to the store", async () => {
      await getContainer().resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).syncSystemRoles()
      await createStaff(getContainer(), "blog-mk@patrix.test", ["marketing"])
      await createStaff(getContainer(), "blog-mg@patrix.test", ["warehouse"])
      await createStaff(getContainer(), "blog-wl@patrix.test", ["owner"])
      const marketing = bearer((await login(api, "blog-mk@patrix.test")).token)
      const warehouse = bearer((await login(api, "blog-mg@patrix.test")).token)
      const owner = bearer((await login(api, "blog-wl@patrix.test")).token)
      const { data: key } = await api.post("/admin/api-keys", { title: "TEST", type: "publishable" }, owner)
      const store = { headers: { "x-publishable-api-key": key.api_key.token } }

      const draft = {
        title: "TEST Jak prać wełnę",
        slug: "test-jak-prac-welne",
        excerpt: "Krótki wpis testowy o praniu wełny.",
        body: "## Wstęp\n\nZobacz [żel](/produkt/test-zel).\n\n- punkt pierwszy\n- punkt drugi",
        product_handles: ["test-zel", "test-zel"],
      }
      expect((await errorOf(api.post("/admin/patrix/blog", { ...draft, body: "[x](javascript:alert(1))" }, marketing))).status).toBe(400)
      expect((await errorOf(api.post("/admin/patrix/blog", { ...draft, cover_url: "/test-assets/a.png" }, marketing))).status).toBe(400)
      expect((await errorOf(api.post("/admin/patrix/blog", draft, warehouse))).status).toBe(403)

      const { data } = await api.post("/admin/patrix/blog", draft, marketing)
      expect(data.post).toMatchObject({ status: "draft", published_at: null, product_handles: ["test-zel"] })
      expect((await errorOf(api.post("/admin/patrix/blog", draft, marketing))).data.message).toContain("ma już inny wpis")

      // szkic nie jest widoczny w sklepie
      expect((await api.get("/store/patrix/blog", store)).data.posts).toEqual([])
      expect((await errorOf(api.get("/store/patrix/blog/test-jak-prac-welne", store))).status).toBe(404)

      const { data: published } = await api.post(`/admin/patrix/blog/${data.post.id}`, { ...draft, status: "published" }, marketing)
      expect(published.post.published_at).not.toBeNull()
      const { data: list } = await api.get("/store/patrix/blog", store)
      expect(list).toMatchObject({ count: 1, posts: [{ slug: "test-jak-prac-welne", title: "TEST Jak prać wełnę" }] })
      expect(list.posts[0].body).toBeUndefined()
      const { data: one } = await api.get("/store/patrix/blog/test-jak-prac-welne", store)
      expect(one.post).toMatchObject({ body: draft.body, product_handles: ["test-zel"] })

      // adres opublikowanego wpisu jest stały, także po wycofaniu publikacji
      const moved = await errorOf(api.post(`/admin/patrix/blog/${data.post.id}`, { ...draft, slug: "test-nowy-adres", status: "published" }, marketing))
      expect(moved.status).toBe(400)
      const { data: unpublished } = await api.post(`/admin/patrix/blog/${data.post.id}`, { ...draft, status: "draft" }, marketing)
      expect(unpublished.post.published_at).toBe(published.post.published_at)
      expect((await api.get("/store/patrix/blog", store)).data.count).toBe(0)

      await api.delete(`/admin/patrix/blog/${data.post.id}`, marketing)
      expect((await api.get("/admin/patrix/blog", marketing)).data.posts).toEqual([])
    })
  },
})
