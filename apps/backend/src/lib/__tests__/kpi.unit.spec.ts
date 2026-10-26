import { awaitingFulfillment, change, dayKey, lowStock, parsePeriod, summarizeOrders, type KpiOrder } from "../kpi"

const NOW = new Date("2026-10-26T10:00:00Z")
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000)

function order(partial: Partial<KpiOrder>): KpiOrder {
  return { status: "pending", created_at: NOW, total: 10, fulfilled: false, items: [], ...partial }
}

describe("KPI pulpitu", () => {
  it("okres: tylko 7, 30 albo 90 dni, domyślnie 30", () => {
    expect(parsePeriod("7")).toBe(7)
    expect(parsePeriod("90")).toBe(90)
    expect(parsePeriod("365")).toBe(30)
    expect(parsePeriod(undefined)).toBe(30)
  })

  it("dzień liczony w strefie Europe/Warsaw", () => {
    // Po zmianie czasu (25.10.2026) Polska ma UTC+1, latem UTC+2
    expect(dayKey("2026-10-25T23:30:00Z")).toBe("2026-10-26")
    expect(dayKey("2026-10-25T22:30:00Z")).toBe("2026-10-25")
    expect(dayKey("2026-07-01T22:30:00Z")).toBe("2026-07-02")
  })

  it("sprzedaż bez anulowanych i szkiców, porównanie z poprzednim okresem", () => {
    const orders = [
      order({ total: 31.97, created_at: daysAgo(1), items: [{ product_id: "p1", title: "A", quantity: 2 }] }),
      order({ total: 18.03, created_at: daysAgo(2), fulfilled: true, items: [{ product_id: "p2", title: "B", quantity: 5 }] }),
      order({ total: 99, status: "canceled", created_at: daysAgo(1) }),
      order({ total: 99, status: "draft", created_at: daysAgo(1) }),
      order({ total: 25, created_at: daysAgo(10) }),
      order({ total: 1000, created_at: daysAgo(30) }),
    ]
    const kpi = summarizeOrders(orders, 7, NOW)
    expect(kpi.current).toEqual({ orders: 2, revenue: 50, average_order_value: 25 })
    expect(kpi.previous).toEqual({ orders: 1, revenue: 25, average_order_value: 25 })
    expect(kpi.daily).toHaveLength(7)
    expect(kpi.daily.at(-1)?.date).toBe("2026-10-26")
    expect(kpi.daily.reduce((s, d) => s + d.orders, 0)).toBe(2)
    expect(kpi.top_products.map((p) => p.product_id)).toEqual(["p2", "p1"])
    // Do wysłania: nieanulowane, niezakończone, bez przesyłki
    expect(awaitingFulfillment([...orders, order({ status: "completed" })])).toBe(3)
  })

  it("pusty okres: brak średniej, zmiana nieokreślona", () => {
    const kpi = summarizeOrders([], 30, NOW)
    expect(kpi.current).toEqual({ orders: 0, revenue: 0, average_order_value: null })
    expect(change(5, 0)).toBeNull()
    expect(change(15, 10)).toBe(50)
    expect(change(5, 10)).toBe(-50)
  })

  it("niski stan: suma lokalizacji minus rezerwacje, od najmniejszego", () => {
    const low = lowStock([
      { inventory_item_id: "i1", sku: "A", title: "A", stocked: 3, reserved: 0 },
      { inventory_item_id: "i1", sku: "A", title: "A", stocked: 10, reserved: 0 },
      { inventory_item_id: "i2", sku: "B", title: "B", stocked: 6, reserved: 4 },
      { inventory_item_id: "i3", sku: "C", title: "C", stocked: 0, reserved: 0 },
    ])
    expect(low.count).toBe(2)
    expect(low.items.map((i) => [i.sku, i.available])).toEqual([
      ["C", 0],
      ["B", 2],
    ])
  })
})
