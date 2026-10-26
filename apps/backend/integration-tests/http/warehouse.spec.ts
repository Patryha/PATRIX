import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../src/modules/patrix-security"
import { recordFulfillmentSales, reverseFulfillmentSales } from "../../src/lib/warehouse-sales"
import { bearer, createStaff, login } from "../utils/staff"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const errorOf = (p: Promise<unknown>) => p.then(() => null).catch((e: any) => e.response)
    let warehouseStaff: { headers: Record<string, string> }
    let marketing: { headers: Record<string, string> }
    let itemId: string
    let locationId: string

    beforeEach(async () => {
      await getContainer().resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).syncSystemRoles()
      await createStaff(getContainer(), "magazyn@patrix.test", ["warehouse"])
      await createStaff(getContainer(), "marketing@patrix.test", ["marketing"])
      warehouseStaff = bearer((await login(api, "magazyn@patrix.test")).token)
      marketing = bearer((await login(api, "marketing@patrix.test")).token)
      const location = await getContainer().resolve(Modules.STOCK_LOCATION).createStockLocations({ name: "TEST Magazyn główny" })
      const [item] = await getContainer().resolve(Modules.INVENTORY).createInventoryItems([{ sku: "TEST-MAG-1", title: "TEST towar" }])
      itemId = item.id
      locationId = location.id
    })

    const level = async () => {
      const [l] = await getContainer().resolve(Modules.INVENTORY).listInventoryLevels({ inventory_item_id: itemId, location_id: locationId })
      return l ? Number(l.stocked_quantity) : null
    }
    const move = (body: Record<string, unknown>, who = warehouseStaff) =>
      api.post("/admin/patrix/warehouse/movements", { inventory_item_id: itemId, location_id: locationId, ...body }, who)

    it("receipts create batches, issues take the batch expiring first (FEFO), log keeps every movement", async () => {
      await move({ type: "receipt", quantity: 10, lot_number: "L-GRUDZIEN", expiry_date: "2026-12-31", document_ref: "PZ 1/2026" })
      await move({ type: "receipt", quantity: 5, lot_number: "L-LISTOPAD", expiry_date: "2026-11-15", document_ref: "PZ 2/2026" })
      expect(await level()).toBe(15)

      const { data: issued } = await move({ type: "issue", quantity: 7, reason: "Wydanie do sklepu stacjonarnego" })
      expect(issued.movements.map((m: any) => m.quantity)).toEqual([-5, -2])
      expect(await level()).toBe(8)

      const { data: stock } = await api.get(`/admin/patrix/warehouse/stock?location_id=${locationId}`, warehouseStaff)
      const row = stock.stock.find((r: any) => r.inventory_item_id === itemId)
      expect(row).toMatchObject({ stocked: 8, tracked: 8, untracked: 0, available: 8 })
      expect(row.batches.map((b: any) => [b.lot_number, b.quantity])).toEqual([["L-GRUDZIEN", 8]])

      const { data: log } = await api.get(`/admin/patrix/warehouse/movements?inventory_item_id=${itemId}`, warehouseStaff)
      expect(log.count).toBe(4)
      expect(log.movements[0]).toMatchObject({ type: "issue", item: { sku: "TEST-MAG-1" } })
    })

    it("rejects issuing more than available and rolls back nothing half-done", async () => {
      await move({ type: "receipt", quantity: 3, expiry_date: "2026-11-30" })
      const err = await errorOf(move({ type: "issue", quantity: 4 }))
      expect(err.status).toBe(400)
      expect(err.data.message).toContain("Za mało dostępnego towaru: dostępne 3")
      expect(await level()).toBe(3)
      const { data: log } = await api.get(`/admin/patrix/warehouse/movements?inventory_item_id=${itemId}`, warehouseStaff)
      expect(log.count).toBe(1)

      // Błąd w drugim kroku (zła partia) cofa zmianę stanu z pierwszego kroku
      const wrongBatch = await errorOf(move({ type: "issue", quantity: 1, batch_id: "batch_nie_istnieje" }))
      expect(wrongBatch.status).toBe(404)
      expect(await level()).toBe(3)
    })

    it("adjustments need a reason; positive adjustment without batch data is untracked stock", async () => {
      expect((await errorOf(move({ type: "adjustment", quantity: 2 }))).status).toBe(400)
      expect((await errorOf(move({ type: "receipt", quantity: -2 }))).status).toBe(400)
      expect((await errorOf(move({ type: "receipt", quantity: 2, expiry_date: "31.12.2026" }))).status).toBe(400)
      await move({ type: "adjustment", quantity: 2, reason: "Znaleziono przy porządkach" })
      const { data: stock } = await api.get(`/admin/patrix/warehouse/stock?location_id=${locationId}`, warehouseStaff)
      expect(stock.stock.find((r: any) => r.inventory_item_id === itemId)).toMatchObject({ stocked: 2, tracked: 0, untracked: 2 })
    })

    it("shipment takes sold quantity from batches (FEFO), once; cancellation returns it", async () => {
      await move({ type: "receipt", quantity: 2, lot_number: "STARA", expiry_date: "2026-11-01" })
      await move({ type: "receipt", quantity: 10, lot_number: "NOWA", expiry_date: "2027-03-01" })
      const fulfillmentModule = getContainer().resolve(Modules.FULFILLMENT)
      const [provider] = await fulfillmentModule.listFulfillmentProviders({})
      const fulfillment = await fulfillmentModule.createFulfillment({
        location_id: locationId,
        provider_id: provider.id,
        delivery_address: { first_name: "Test", address_1: "Testowa 1", city: "Warszawa", postal_code: "00-001", country_code: "pl" },
        items: [{ title: "TEST towar", sku: "TEST-MAG-1", quantity: 3, barcode: "", inventory_item_id: itemId }],
        labels: [],
        order: {},
      } as any)

      expect(await recordFulfillmentSales(getContainer(), fulfillment.id)).toBe(1)
      expect(await recordFulfillmentSales(getContainer(), fulfillment.id)).toBe(0)
      const { data: log } = await api.get(`/admin/patrix/warehouse/movements?type=sale`, warehouseStaff)
      expect(log.movements.map((m: any) => [m.batch.lot_number, m.quantity]).sort()).toEqual([
        ["NOWA", -1],
        ["STARA", -2],
      ])

      expect(await reverseFulfillmentSales(getContainer(), fulfillment.id)).toBe(2)
      expect(await reverseFulfillmentSales(getContainer(), fulfillment.id)).toBe(0)
      const { data: stock } = await api.get(`/admin/patrix/warehouse/stock?location_id=${locationId}`, warehouseStaff)
      const row = stock.stock.find((r: any) => r.inventory_item_id === itemId)
      expect(row.batches.map((b: any) => [b.lot_number, b.quantity])).toEqual([
        ["STARA", 2],
        ["NOWA", 10],
      ])
    })

    it("stock count: opens with all items, saves counts, books differences once, refuses a second open count", async () => {
      await move({ type: "receipt", quantity: 10, lot_number: "SPIS", expiry_date: "2027-01-31" })
      const { data: opened } = await api.post("/admin/patrix/warehouse/counts", { location_id: locationId, note: "Spis roczny TEST" }, warehouseStaff)
      expect(opened.lines).toBe(1)
      expect((await errorOf(api.post("/admin/patrix/warehouse/counts", { location_id: locationId }, warehouseStaff))).status).toBe(400)

      const { data: sheet } = await api.get(`/admin/patrix/warehouse/counts/${opened.count.id}`, warehouseStaff)
      expect(sheet.lines[0]).toMatchObject({ sku: "TEST-MAG-1", expected: 10, current: 10, counted: null, difference: null })
      expect((await errorOf(api.post(`/admin/patrix/warehouse/counts/${opened.count.id}/lines`, { lines: [{ id: "scln_obcy", counted: 1 }] }, warehouseStaff))).status).toBe(400)
      await api.post(`/admin/patrix/warehouse/counts/${opened.count.id}/lines`, { lines: [{ id: sheet.lines[0].id, counted: 8 }] }, warehouseStaff)

      const { data: closed } = await api.post(`/admin/patrix/warehouse/counts/${opened.count.id}/close`, {}, warehouseStaff)
      expect(closed).toMatchObject({ counted: 1, adjusted: 1, not_counted: 0 })
      expect(await level()).toBe(8)
      const { data: log } = await api.get(`/admin/patrix/warehouse/movements?type=count`, warehouseStaff)
      expect(log.movements).toHaveLength(1)
      expect(log.movements[0]).toMatchObject({ quantity: -2, reason: "Inwentaryzacja", batch: { lot_number: "SPIS" } })
      expect((await errorOf(api.post(`/admin/patrix/warehouse/counts/${opened.count.id}/close`, {}, warehouseStaff))).status).toBe(400)

      // Po zamknięciu można otworzyć kolejny spis
      const { data: second } = await api.post("/admin/patrix/warehouse/counts", { location_id: locationId }, warehouseStaff)
      await api.post(`/admin/patrix/warehouse/counts/${second.count.id}/cancel`, {}, warehouseStaff)
      expect(await level()).toBe(8)
    })

    it("expiry report lists expired and soon-expiring batches; marketing has no access", async () => {
      const soon = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)
      const later = new Date(Date.now() + 200 * 86_400_000).toISOString().slice(0, 10)
      await move({ type: "receipt", quantity: 4, lot_number: "SOON", expiry_date: soon })
      await move({ type: "receipt", quantity: 4, lot_number: "LATER", expiry_date: later })
      const { data } = await api.get("/admin/patrix/warehouse/batches", warehouseStaff)
      expect(data.batches.map((b: any) => b.lot_number)).toEqual(["SOON"])
      expect(data.batches[0]).toMatchObject({ state: "soon", item: { sku: "TEST-MAG-1" }, location: "TEST Magazyn główny" })
      expect((await errorOf(api.get("/admin/patrix/warehouse/batches", marketing))).status).toBe(403)
    })
  },
})
