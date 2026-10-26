import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createHmac } from "node:crypto"
import { registerAdapter } from "../../src/integrations/manifest"
import { MAX_WEBHOOK_ATTEMPTS, retryDueWebhooks } from "../../src/lib/integrations"
import { PATRIX_INTEGRATIONS_MODULE, type PatrixIntegrationsService } from "../../src/modules/patrix-integrations"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../src/modules/patrix-security"
import { bearer, createStaff, login } from "../utils/staff"

jest.setTimeout(180 * 1000)

// Adapter testowy (tylko w testach): podpis HMAC-SHA256 treści w nagłówku, obsługa może celowo zawieść.
const handled: string[] = []
const failures = new Map<string, number>()
registerAdapter({
  id: "test-hmac",
  credentialFields: [
    { key: "webhook_secret", label: "Sekret webhooka", secret: true },
    { key: "account", label: "Konto", secret: false },
  ],
  verifyWebhook: (raw, headers, credentials) => {
    const expected = createHmac("sha256", credentials.webhook_secret).update(raw).digest("hex")
    if (headers["x-test-signature"] !== expected) {
      return { valid: false, reason: "zły podpis" }
    }
    const body = JSON.parse(raw.toString("utf8"))
    return { valid: true, external_id: body.id, event_type: body.type, payload: body }
  },
  handleWebhook: async (event) => {
    const left = failures.get(event.external_id) ?? 0
    if (left > 0) {
      failures.set(event.external_id, left - 1)
      throw new Error("Operator chwilowo niedostępny")
    }
    handled.push(event.external_id)
    return "processed"
  },
})

const SECRET = "whsec_test_0123456789abcdef"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const errorOf = (p: Promise<unknown>) => p.then(() => null).catch((e: any) => e.response)
    let owner: { headers: Record<string, string> }
    let warehouse: { headers: Record<string, string> }
    const send = (body: Record<string, unknown>, secret = SECRET) => {
      const raw = JSON.stringify(body)
      const signature = createHmac("sha256", secret).update(raw).digest("hex")
      return api.post("/hooks/patrix/test-hmac", raw, { headers: { "content-type": "application/json", "x-test-signature": signature } })
    }

    beforeEach(async () => {
      handled.length = 0
      failures.clear()
      await getContainer().resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).syncSystemRoles()
      await createStaff(getContainer(), "wl@patrix.test", ["owner"])
      await createStaff(getContainer(), "mg@patrix.test", ["warehouse"])
      owner = bearer((await login(api, "wl@patrix.test")).token)
      warehouse = bearer((await login(api, "mg@patrix.test")).token)
    })

    it("lists the manifest honestly: planned integrations without an adapter are not available; needs integration permission", async () => {
      const { data } = await api.get("/admin/patrix/integrations", owner)
      expect(data.production_allowed).toBe(false)
      const p24 = data.integrations.find((i: any) => i.id === "przelewy24")
      expect(p24).toMatchObject({ available: false, fields: [], can_test: false, webhook_path: null, connection: null })
      expect(data.integrations.find((i: any) => i.id === "test-hmac")).toMatchObject({ available: true, webhook_path: "/hooks/patrix/test-hmac" })
      expect((await errorOf(api.get("/admin/patrix/integrations", warehouse))).status).toBe(403)
      expect((await errorOf(api.post("/admin/patrix/integrations/przelewy24", { enabled: true }, owner))).status).toBe(404)
    })

    it("stores credentials encrypted, shows only hints, refuses production and incomplete enabling, audits without values", async () => {
      expect((await errorOf(api.post("/admin/patrix/integrations/test-hmac", { enabled: true }, owner))).data.message).toContain("Uzupełnij pola: Sekret webhooka, Konto")
      expect((await errorOf(api.post("/admin/patrix/integrations/test-hmac", { mode: "production" }, owner))).data.message).toContain("Tryb produkcyjny")

      const { data } = await api.post("/admin/patrix/integrations/test-hmac", { credentials: { webhook_secret: SECRET, account: "konto-1" }, enabled: true }, owner)
      expect(data.connection).toEqual({ mode: "sandbox", enabled: true, hints: { webhook_secret: "••••cdef", account: "konto-1" } })
      expect(JSON.stringify(data)).not.toContain(SECRET)

      const [stored] = await getContainer().resolve<PatrixIntegrationsService>(PATRIX_INTEGRATIONS_MODULE).listIntegrationConnections({ adapter: "test-hmac" })
      expect(stored.credentials).toMatch(/^v1:/)
      expect(stored.credentials).not.toContain(SECRET)

      // Puste pole = bez zmiany sekretu
      await api.post("/admin/patrix/integrations/test-hmac", { credentials: { webhook_secret: "", account: "konto-2" } }, owner)
      const { data: list } = await api.get("/admin/patrix/integrations", owner)
      expect(list.integrations.find((i: any) => i.id === "test-hmac").connection.hints).toEqual({ webhook_secret: "••••cdef", account: "konto-2" })

      const audit = await getContainer().resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).listAuditLogs({ action: "integration.updated" } as any)
      expect(audit.length).toBeGreaterThan(0)
      expect(JSON.stringify(audit)).not.toContain(SECRET)
    })

    it("webhook: bad signature 401, valid once (duplicates ignored), failures retried with backoff, then dead and manual retry", async () => {
      expect((await errorOf(send({ id: "evt_1", type: "payment.paid" }))).status).toBe(404) // integracja jeszcze nie włączona
      await api.post("/admin/patrix/integrations/test-hmac", { credentials: { webhook_secret: SECRET, account: "k" }, enabled: true }, owner)

      expect((await errorOf(send({ id: "evt_1", type: "payment.paid" }, "zly-sekret"))).status).toBe(401)
      expect((await send({ id: "evt_1", type: "payment.paid" })).data).toEqual({ received: true })
      expect((await send({ id: "evt_1", type: "payment.paid" })).data).toEqual({ received: true, duplicate: true })
      expect(handled).toEqual(["evt_1"])

      // Błąd obsługi: operator dostaje 200, my ponawiamy po terminie
      failures.set("evt_2", 1)
      await send({ id: "evt_2", type: "payment.paid" })
      const svc = getContainer().resolve<PatrixIntegrationsService>(PATRIX_INTEGRATIONS_MODULE)
      const [failed] = await svc.listIntegrationWebhooks({ external_id: "evt_2" })
      expect(failed).toMatchObject({ status: "failed", attempts: 1, last_error: "Operator chwilowo niedostępny" })
      expect(await retryDueWebhooks(getContainer(), new Date())).toBe(0) // termin jeszcze nie minął
      expect(await retryDueWebhooks(getContainer(), new Date(Date.now() + 2 * 60_000))).toBe(1)
      expect(handled).toEqual(["evt_1", "evt_2"])

      // Wyczerpane próby → „dead”, ręczne ponowienie z panelu
      failures.set("evt_3", MAX_WEBHOOK_ATTEMPTS)
      await send({ id: "evt_3", type: "payment.paid" })
      const [third] = await svc.listIntegrationWebhooks({ external_id: "evt_3" })
      await svc.updateIntegrationWebhooks({ id: third.id, attempts: MAX_WEBHOOK_ATTEMPTS - 1, next_attempt_at: new Date(0) })
      await retryDueWebhooks(getContainer(), new Date())
      expect((await svc.retrieveIntegrationWebhook(third.id)).status).toBe("dead")
      failures.set("evt_3", 0)
      expect((await api.post(`/admin/patrix/integrations/webhooks/${third.id}/retry`, {}, owner)).data).toEqual({ status: "processed" })
      expect((await errorOf(api.post(`/admin/patrix/integrations/webhooks/${third.id}/retry`, {}, owner))).status).toBe(400)

      const { data: inbox } = await api.get("/admin/patrix/integrations/webhooks?adapter=test-hmac", owner)
      expect(inbox.count).toBe(3)
      expect(inbox.webhooks[0].payload).toBeUndefined()
      const { data: logs } = await api.get("/admin/patrix/integrations/logs?ok=false", owner)
      expect(logs.logs.some((l: any) => l.message === "Odrzucony: zły podpis")).toBe(true)
      expect(JSON.stringify(logs)).not.toContain(SECRET)
    })
  },
})
