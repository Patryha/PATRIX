import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../src/modules/patrix-security"
import { bearer, createStaff, login, totp } from "../utils/staff"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const status = async (promise: Promise<{ status: number }>) =>
      promise.then((r) => r.status).catch((e) => e.response?.status as number)

    beforeEach(async () => {
      await getContainer().resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).syncSystemRoles()
    })

    describe("health and security headers", () => {
      // Odpowiedzi 401 z wbudowanego uwierzytelniania Medusy powstają przed naszymi middleware;
      // dla nich nagłówki dokłada reverse proxy (infra/caddy/Caddyfile).
      it("responds on /health and sends hardening headers on API routes", async () => {
        expect((await api.get("/health")).status).toBe(200)
        await createStaff(getContainer(), "naglowki@patrix.test", ["owner"])
        const { token } = await login(api, "naglowki@patrix.test")
        const res = await api.get("/admin/products", bearer(token))
        expect(res.headers["x-content-type-options"]).toBe("nosniff")
        expect(res.headers["x-frame-options"]).toBe("DENY")
        expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'")
        expect(res.headers["x-powered-by"]).toBeUndefined()
      })
    })

    describe("staff roles (deny by default)", () => {
      it("rejects anonymous requests to the admin API", async () => {
        expect(await status(api.get("/admin/products"))).toBe(401)
      })

      it("blocks a staff account without any role", async () => {
        await createStaff(getContainer(), "brak-roli@patrix.test")
        const { token } = await login(api, "brak-roli@patrix.test")
        const err = await api.get("/admin/products", bearer(token)).catch((e: any) => e.response)
        expect(err.status).toBe(403)
        expect(err.data.code).toBe("PERMISSION_DENIED")
      })

      it("lets the owner use everything", async () => {
        await createStaff(getContainer(), "wlasciciel@patrix.test", ["owner"])
        const { token } = await login(api, "wlasciciel@patrix.test")
        expect(await status(api.get("/admin/products", bearer(token)))).toBe(200)
        expect(await status(api.get("/admin/customers", bearer(token)))).toBe(200)
        expect(await status(api.get("/admin/patrix/audit-logs", bearer(token)))).toBe(200)
      })

      it("limits the warehouse role to stock and fulfilment", async () => {
        await createStaff(getContainer(), "magazyn@patrix.test", ["warehouse"])
        const { token } = await login(api, "magazyn@patrix.test")
        expect(await status(api.get("/admin/inventory-items", bearer(token)))).toBe(200)
        expect(await status(api.get("/admin/products", bearer(token)))).toBe(200)
        expect(await status(api.get("/admin/customers", bearer(token)))).toBe(403)
        expect(await status(api.post("/admin/products", { title: "X" }, bearer(token)))).toBe(403)
        expect(await status(api.get("/admin/patrix/audit-logs", bearer(token)))).toBe(403)
        expect(await status(api.post("/admin/api-keys", { title: "x", type: "secret" }, bearer(token)))).toBe(403)
      })

      it("does not let staff change roles without staff_role permission", async () => {
        const target = await createStaff(getContainer(), "cel@patrix.test")
        await createStaff(getContainer(), "kierownik@patrix.test", ["store_manager"])
        const { token } = await login(api, "kierownik@patrix.test")
        expect(
          await status(api.post(`/admin/patrix/users/${target.id}/roles`, { roles: ["owner"] }, bearer(token)))
        ).toBe(403)
      })

      it("lets the owner assign roles, audits it and keeps at least one owner", async () => {
        const owner = await createStaff(getContainer(), "wlasciciel2@patrix.test", ["owner"])
        const target = await createStaff(getContainer(), "nowy@patrix.test")
        const { token } = await login(api, "wlasciciel2@patrix.test")

        const res = await api.post(`/admin/patrix/users/${target.id}/roles`, { roles: ["marketing"] }, bearer(token))
        expect(res.data.roles.map((r: any) => r.handle)).toEqual(["marketing"])

        const last = await api
          .post(`/admin/patrix/users/${owner.id}/roles`, { roles: [] }, bearer(token))
          .catch((e: any) => e.response)
        expect(last.status).toBe(400)

        const audit = await api.get("/admin/patrix/audit-logs?action=staff.roles_changed", bearer(token))
        expect(audit.data.audit_logs[0].metadata).toEqual({ user_id: target.id, roles: ["marketing"] })
      })

      it("rejects unknown permissions in custom roles", async () => {
        await createStaff(getContainer(), "wl3@patrix.test", ["owner"])
        const { token } = await login(api, "wl3@patrix.test")
        const err = await api
          .post("/admin/patrix/roles", { handle: "zla_rola", name: "Zła", permissions: ["hack:all"] }, bearer(token))
          .catch((e: any) => e.response)
        expect(err.status).toBe(400)
      })

      it("manages custom roles: list staff, edit, refuse system role changes and deleting assigned roles", async () => {
        await createStaff(getContainer(), "wl4@patrix.test", ["owner"])
        const worker = await createStaff(getContainer(), "pracownik4@patrix.test", [])
        await createStaff(getContainer(), "kierownik4@patrix.test", ["store_manager"])
        const owner = bearer((await login(api, "wl4@patrix.test")).token)
        const manager = bearer((await login(api, "kierownik4@patrix.test")).token)

        const { data: staff } = await api.get("/admin/patrix/staff", owner)
        expect(staff.users.find((u: any) => u.email === "wl4@patrix.test").roles).toEqual(["owner"])
        expect(staff.users.find((u: any) => u.email === "pracownik4@patrix.test").roles).toEqual([])
        expect(await status(api.get("/admin/patrix/staff", manager))).toBe(403)

        const { data: created } = await api.post("/admin/patrix/roles", { handle: "pakowanie", name: "Pakowanie", permissions: ["panel:read"] }, owner)
        const id = created.role.id
        const { data: updated } = await api.post(`/admin/patrix/roles/${id}`, { permissions: ["panel:read", "fulfillment:*"] }, owner)
        expect(updated.role.permissions).toEqual(["panel:read", "fulfillment:*"])
        expect(await status(api.post(`/admin/patrix/roles/${id}`, { permissions: ["hack:all"] }, owner))).toBe(400)
        expect(await status(api.post(`/admin/patrix/roles/${id}`, { handle: "inna" }, owner))).toBe(400)

        const { data: roles } = await api.get("/admin/patrix/roles", owner)
        const ownerRole = roles.roles.find((r: any) => r.handle === "owner")
        expect(await status(api.post(`/admin/patrix/roles/${ownerRole.id}`, { name: "Szef" }, owner))).toBe(400)
        expect(await status(api.delete(`/admin/patrix/roles/${ownerRole.id}`, owner))).toBe(400)

        await api.post(`/admin/patrix/users/${worker.id}/roles`, { roles: ["pakowanie"] }, owner)
        expect(await status(api.delete(`/admin/patrix/roles/${id}`, owner))).toBe(409)
        await api.post(`/admin/patrix/users/${worker.id}/roles`, { roles: [] }, owner)
        expect(await status(api.delete(`/admin/patrix/roles/${id}`, owner))).toBe(200)
        const audit = await api.get("/admin/patrix/audit-logs?action=staff.role_deleted", owner)
        expect(audit.data.audit_logs[0].metadata).toEqual({ role: "pakowanie" })
      })
    })

    describe("customers cannot reach the admin API", () => {
      it("rejects a customer token on admin routes", async () => {
        const reg = await api.post("/auth/customer/emailpass/register", {
          email: "klient@patrix.test",
          password: "Klient-Passw0rd!",
        })
        const token = reg.data.token
        expect(await status(api.get("/admin/products", bearer(token)))).toBe(401)
        expect(await status(api.get("/admin/patrix/roles", bearer(token)))).toBe(401)
        expect(await status(api.get("/admin/customers", bearer(token)))).toBe(401)
      })
    })

    describe("audit log", () => {
      it("records failed and successful staff logins without storing the password", async () => {
        await createStaff(getContainer(), "audyt@patrix.test", ["owner"])
        await api.post("/auth/user/emailpass", { email: "audyt@patrix.test", password: "zle-haslo" }).catch(() => null)
        const { token } = await login(api, "audyt@patrix.test")
        // Zapis audytu jest asynchroniczny (po wysłaniu odpowiedzi).
        await new Promise((r) => setTimeout(r, 300))
        const res = await api.get("/admin/patrix/audit-logs?limit=10", bearer(token))
        const actions = res.data.audit_logs.map((l: any) => l.action)
        expect(actions).toEqual(expect.arrayContaining(["auth.login_failed", "auth.login_succeeded"]))
        expect(JSON.stringify(res.data)).not.toContain("zle-haslo")
      })

      it("records admin mutations", async () => {
        await createStaff(getContainer(), "audyt2@patrix.test", ["owner"])
        const { token } = await login(api, "audyt2@patrix.test")
        await api.post("/admin/product-tags", { value: "test" }, bearer(token))
        await new Promise((r) => setTimeout(r, 300))
        const res = await api.get("/admin/patrix/audit-logs?action=admin.request", bearer(token))
        expect(res.data.audit_logs[0]).toMatchObject({ method: "POST", path: "/admin/product-tags", status_code: 200 })
      })
    })

    describe("MFA (native TOTP) and enforcement", () => {
      afterEach(() => {
        delete process.env.ADMIN_MFA_ENFORCEMENT
      })

      it("requires MFA enrolment when enforcement is on, then requires the code at login", async () => {
        process.env.ADMIN_MFA_ENFORCEMENT = "required"
        await createStaff(getContainer(), "mfa@patrix.test", ["owner"])
        let { token } = await login(api, "mfa@patrix.test")

        const blocked = await api.get("/admin/products", bearer(token)).catch((e: any) => e.response)
        expect(blocked.status).toBe(403)
        expect(blocked.data.code).toBe("MFA_ENROLLMENT_REQUIRED")
        expect(await status(api.get("/admin/users/me", bearer(token)))).toBe(200)

        const enroll = await api.post("/auth/mfa/factors", { provider: "totp" }, bearer(token))
        const factorId = enroll.data.mfa_factor.id
        await api.post(`/auth/mfa/factors/${factorId}/verify`, { code: totp(enroll.data.secret) }, bearer(token))

        // Ponowne logowanie: samo hasło nie wystarcza.
        const first = await login(api, "mfa@patrix.test")
        expect(first.mfa_required).toBe(true)
        expect(await status(api.get("/admin/products", bearer(first.token)))).toBe(401)

        const wrong = await api
          .post(`/auth/mfa/challenges/${first.mfa_challenge!.id}/verify`, { method: "totp", code: "000000" }, bearer(first.token))
          .catch((e: any) => e.response)
        expect(wrong.status).toBeGreaterThanOrEqual(400)

        const second = await login(api, "mfa@patrix.test")
        const verified = await api.post(
          `/auth/mfa/challenges/${second.mfa_challenge!.id}/verify`,
          { method: "totp", code: totp(enroll.data.secret, Date.now() + 30_000) },
          bearer(second.token)
        )
        token = verified.data.token
        expect(await status(api.get("/admin/products", bearer(token)))).toBe(200)
      })
    })
  },
})
