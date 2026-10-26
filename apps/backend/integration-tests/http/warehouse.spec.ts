import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../src/modules/patrix-security"
import { recordReturnRestock } from "../../src/lib/warehouse-returns"
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

    it("transfer (MM) moves stock and batches with lot and expiry, all or nothing", async () => {
      const container = getContainer()
      const target = await container.resolve(Modules.STOCK_LOCATION).createStockLocations({ name: "TEST Magazyn 2" })
      const levelAt = async (loc: string) => {
        const [l] = await container.resolve(Modules.INVENTORY).listInventoryLevels({ inventory_item_id: itemId, location_id: loc })
        return l ? Number(l.stocked_quantity) : null
      }
      const transfer = (body: Record<string, unknown>) =>
        api.post(
          "/admin/patrix/warehouse/transfers",
          { inventory_item_id: itemId, from_location_id: locationId, to_location_id: target.id, ...body },
          warehouseStaff
        )
      await move({ type: "receipt", quantity: 5, lot_number: "LATER", expiry_date: "2027-03-01" })
      await move({ type: "receipt", quantity: 3, lot_number: "SOONER", expiry_date: "2027-01-01" })

      const { data } = await transfer({ quantity: 4, document_ref: "MM/1" })
      expect(data.movements).toHaveLength(4)
      expect(await levelAt(locationId)).toBe(4)
      expect(await levelAt(target.id)).toBe(4)
      const { data: stock } = await api.get(`/admin/patrix/warehouse/stock?location_id=${target.id}`, warehouseStaff)
      const moved = stock.stock.find((r: { inventory_item_id: string }) => r.inventory_item_id === itemId)
      expect(moved.batches.map((b: { lot_number: string; quantity: number }) => [b.lot_number, b.quantity])).toEqual([
        ["SOONER", 3],
        ["LATER", 1],
      ])
      expect(moved.untracked).toBe(0)

      // Za dużo, ta sama lokalizacja, zła partia: nic się nie zmienia
      expect((await errorOf(transfer({ quantity: 5 }))).status).toBe(400)
      expect((await errorOf(transfer({ quantity: 1, to_location_id: locationId }))).status).toBe(400)
      expect((await errorOf(transfer({ quantity: 1, batch_id: "batch_nie_istnieje" }))).status).toBe(404)
      expect(await levelAt(locationId)).toBe(4)
      expect(await levelAt(target.id)).toBe(4)
      const { data: log } = await api.get("/admin/patrix/warehouse/movements?type=transfer", warehouseStaff)
      expect(log.count).toBe(4)
      expect((await errorOf(transfer({ quantity: 1 }).then(() => api.post("/admin/patrix/warehouse/transfers", {}, marketing)))).status).toBe(403)
    })

    it("exports the movement log as CSV for Excel, filtered by period", async () => {
      await move({ type: "receipt", quantity: 4, lot_number: "=HACK()", expiry_date: "2027-01-01", document_ref: "PZ/1" })
      await move({ type: "issue", quantity: 1, document_ref: "WZ/1" })
      const res = await api.get("/admin/patrix/warehouse/movements/export", warehouseStaff)
      expect(res.headers["content-type"]).toContain("text/csv")
      expect(res.headers["content-disposition"]).toContain("ruchy-magazynowe")
      const lines = (res.data as string).replace(/^\uFEFF/, "").trim().split("\r\n")
      expect(lines[0]).toBe("data;rodzaj;sku;towar;lokalizacja;ilosc;partia;data_waznosci;dokument;powod")
      expect(lines).toHaveLength(3)
      expect(lines[1]).toContain(";przyjęcie;TEST-MAG-1;TEST towar;TEST Magazyn główny;4;'=HACK();2027-01-01;PZ/1;")
      expect(lines[2]).toContain(";wydanie;TEST-MAG-1;TEST towar;TEST Magazyn główny;-1;'=HACK();2027-01-01;WZ/1;")
      const future = await api.get("/admin/patrix/warehouse/movements/export?from=2099-01-01&to=2099-01-31", warehouseStaff)
      expect((future.data as string).trim().split("\r\n")).toHaveLength(1)
      expect((await errorOf(api.get("/admin/patrix/warehouse/movements/export?from=1.01.2026", warehouseStaff))).status).toBe(400)
    })

    it("stock value at purchase cost needs finance permission; items without cost are listed, not guessed", async () => {
      await createStaff(getContainer(), "wlasciciel@patrix.test", ["owner"])
      const owner = bearer((await login(api, "wlasciciel@patrix.test")).token)
      const { data } = await api.post(
        "/admin/products",
        {
          title: "TEST wartość",
          handle: "test-wartosc",
          status: "draft",
          options: [{ title: "Rozmiar", values: ["1"] }],
          variants: [{ title: "1", sku: "TEST-WART-1", manage_inventory: true, options: { Rozmiar: "1" }, prices: [{ amount: 9.99, currency_code: "pln" }] }],
        },
        owner
      )
      const variantId = data.product.variants[0].id
      const { data: withLinks } = await api.get(`/admin/products/${data.product.id}?fields=variants.inventory_items.inventory_item_id`, owner)
      const costedItem = withLinks.product.variants[0].inventory_items[0].inventory_item_id
      await api.post("/admin/patrix/variants/" + variantId + "/cost", { purchase_price: 4.5 }, owner)
      await api.post("/admin/patrix/warehouse/movements", { type: "receipt", inventory_item_id: costedItem, location_id: locationId, quantity: 10 }, owner)
      await move({ type: "receipt", quantity: 3 })

      const { data: value } = await api.get(`/admin/patrix/warehouse/value?location_id=${locationId}`, owner)
      expect(value.total_value).toBe(45)
      expect(value.missing_cost).toBe(1)
      expect(value.rows).toEqual([
        expect.objectContaining({ sku: "TEST-WART-1", quantity: 10, unit_cost: 4.5, value: 45 }),
        expect.objectContaining({ sku: "TEST-MAG-1", quantity: 3, unit_cost: null, value: null }),
      ])
      expect((await errorOf(api.get("/admin/patrix/warehouse/value", warehouseStaff))).status).toBe(403)
    })

    it("customer return puts undamaged units back into the batches the order was sold from, once", async () => {
      const container = getContainer()
      await createStaff(container, "wl-zwrot@patrix.test", ["owner"])
      const owner = bearer((await login(api, "wl-zwrot@patrix.test")).token)
      const { data } = await api.post(
        "/admin/products",
        {
          title: "TEST zwrot",
          handle: "test-zwrot",
          status: "draft",
          options: [{ title: "Rozmiar", values: ["1"] }],
          variants: [{ title: "1", sku: "TEST-ZWROT-1", manage_inventory: true, options: { Rozmiar: "1" }, prices: [{ amount: 5, currency_code: "pln" }] }],
        },
        owner
      )
      const variantId = data.product.variants[0].id
      const { data: withLinks } = await api.get(`/admin/products/${data.product.id}?fields=variants.inventory_items.inventory_item_id`, owner)
      const item = withLinks.product.variants[0].inventory_items[0].inventory_item_id
      const receive = (body: Record<string, unknown>) =>
        api.post("/admin/patrix/warehouse/movements", { type: "receipt", inventory_item_id: item, location_id: locationId, ...body }, owner)
      await receive({ quantity: 2, lot_number: "STARA", expiry_date: "2026-12-01" })
      await receive({ quantity: 10, lot_number: "NOWA", expiry_date: "2027-03-01" })

      // Zamówienie na 3 szt. wysłane z magazynu: sprzedaż STARA 2 + NOWA 1
      const orders = container.resolve(Modules.ORDER)
      const [order] = await orders.createOrders([
        { email: "zwrot@example.test", currency_code: "pln", status: "pending", items: [{ title: "TEST zwrot", variant_id: variantId, quantity: 3, unit_price: 5 }] },
      ])
      const [orderItem] = (await orders.retrieveOrder(order.id, { relations: ["items"] })).items!
      const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
      const [provider] = await fulfillmentModule.listFulfillmentProviders({})
      const fulfillment = await fulfillmentModule.createFulfillment({
        location_id: locationId,
        provider_id: provider.id,
        delivery_address: { first_name: "Test", address_1: "Testowa 1", city: "Warszawa", postal_code: "00-001", country_code: "pl" },
        items: [{ title: "TEST zwrot", sku: "TEST-ZWROT-1", quantity: 3, barcode: "", inventory_item_id: item, line_item_id: orderItem.id }],
        labels: [],
        order: {},
      } as any)
      await container.resolve(ContainerRegistrationKeys.LINK).create({ [Modules.ORDER]: { order_id: order.id }, [Modules.FULFILLMENT]: { fulfillment_id: fulfillment.id } })
      await recordFulfillmentSales(container, fulfillment.id)

      // Zwrot 3 szt., przed przyjęciem nic się nie dzieje
      const ret = await orders.createReturns({ order_id: order.id, location_id: locationId })
      await orders.createReturnItems({ return_id: ret.id, item_id: orderItem.id, quantity: 3 })
      expect(await recordReturnRestock(container, ret.id)).toBe(0)

      // Przyjęto 3, z czego 1 uszkodzona: 2 wracają (Medusa podnosi stan, my partie): najpierw krótsza data ważności
      const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      const big = (n: number) => JSON.stringify({ value: String(n), precision: 20 })
      await knex("return_item")
        .where({ return_id: ret.id })
        .update({ received_quantity: 3, raw_received_quantity: big(3), damaged_quantity: 1, raw_damaged_quantity: big(1) })
      expect(await recordReturnRestock(container, ret.id)).toBe(1)
      expect(await recordReturnRestock(container, ret.id)).toBe(0)

      const { data: log } = await api.get(`/admin/patrix/warehouse/movements?type=return&inventory_item_id=${item}`, owner)
      expect(log.movements.map((m: any) => [m.batch?.lot_number, m.quantity])).toEqual([["STARA", 2]])
      const { data: stock } = await api.get(`/admin/patrix/warehouse/stock?location_id=${locationId}&q=TEST-ZWROT-1`, owner)
      expect(stock.stock[0].batches.map((b: any) => [b.lot_number, b.quantity])).toEqual([
        ["STARA", 2],
        ["NOWA", 9],
      ])
    })

    it("lookup by scanned EAN or SKU returns the stock item with stock per location", async () => {
      await createStaff(getContainer(), "wl-skan@patrix.test", ["owner"])
      const owner = bearer((await login(api, "wl-skan@patrix.test")).token)
      const { data } = await api.post(
        "/admin/products",
        {
          title: "TEST skan",
          handle: "test-skan",
          status: "draft",
          options: [{ title: "Rozmiar", values: ["1"] }],
          variants: [{ title: "1", sku: "TEST-SKAN-1", ean: "2000000009995", manage_inventory: true, options: { Rozmiar: "1" }, prices: [{ amount: 5, currency_code: "pln" }] }],
        },
        owner
      )
      const { data: withLinks } = await api.get(`/admin/products/${data.product.id}?fields=variants.inventory_items.inventory_item_id`, owner)
      const item = withLinks.product.variants[0].inventory_items[0].inventory_item_id
      await api.post("/admin/patrix/warehouse/movements", { type: "receipt", inventory_item_id: item, location_id: locationId, quantity: 7 }, owner)

      const { data: byEan } = await api.get("/admin/patrix/warehouse/lookup?code=2000000009995", warehouseStaff)
      expect(byEan.matches).toEqual([
        expect.objectContaining({ sku: "TEST-SKAN-1", inventory_item_id: item, required_quantity: 1, stock: [expect.objectContaining({ location_id: locationId, stocked: 7, available: 7 })] }),
      ])
      const { data: bySku } = await api.get("/admin/patrix/warehouse/lookup?code=TEST-SKAN-1", warehouseStaff)
      expect(bySku.matches).toHaveLength(1)
      const { data: none } = await api.get("/admin/patrix/warehouse/lookup?code=0000000000000", warehouseStaff)
      expect(none.matches).toEqual([])
      expect((await errorOf(api.get("/admin/patrix/warehouse/lookup?code=", warehouseStaff))).status).toBe(400)
      expect((await errorOf(api.get("/admin/patrix/warehouse/lookup?code=TEST-SKAN-1", marketing))).status).toBe(403)
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
