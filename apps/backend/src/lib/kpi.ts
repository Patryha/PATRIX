/**
 * Wskaźniki pulpitu (KPI) liczone z zamówień. Funkcje czyste: zapytania do bazy są w trasie API.
 * Dni liczymy w strefie Europe/Warsaw, kwoty w walucie sklepu (PLN), zaokrąglone do grosza.
 */
export const KPI_PERIODS = [7, 30, 90] as const
export type KpiPeriod = (typeof KPI_PERIODS)[number]
export const LOW_STOCK_THRESHOLD = 5

export type KpiOrder = {
  status: string
  created_at: Date | string
  total: number | null
  fulfilled: boolean
  items: { product_id: string | null; title: string | null; quantity: number }[]
}

export type PeriodSummary = { orders: number; revenue: number; average_order_value: number | null }

const DAY_MS = 24 * 60 * 60 * 1000
const warsawDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" })

export function parsePeriod(value: unknown): KpiPeriod {
  const days = Number(value)
  return (KPI_PERIODS as readonly number[]).includes(days) ? (days as KpiPeriod) : 30
}

/** Data w formacie RRRR-MM-DD w polskiej strefie czasowej. */
export function dayKey(date: Date | string): string {
  return warsawDay.format(new Date(date))
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Zamówienia liczone do sprzedaży: bez anulowanych i szkiców. */
export function isCounted(order: Pick<KpiOrder, "status">) {
  return order.status !== "canceled" && order.status !== "draft"
}

function summarize(orders: KpiOrder[]): PeriodSummary {
  const revenue = round2(orders.reduce((sum, o) => sum + Number(o.total ?? 0), 0))
  return { orders: orders.length, revenue, average_order_value: orders.length ? round2(revenue / orders.length) : null }
}

/** Zmiana procentowa względem poprzedniego okresu; null, gdy wcześniej nie było sprzedaży. */
export function change(current: number, previous: number): number | null {
  return previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null
}

export function summarizeOrders(all: KpiOrder[], days: number, now = new Date()) {
  const start = now.getTime() - days * DAY_MS
  const previousStart = start - days * DAY_MS
  const counted = all.filter(isCounted)
  const current = counted.filter((o) => new Date(o.created_at).getTime() >= start)
  const previous = counted.filter((o) => {
    const t = new Date(o.created_at).getTime()
    return t >= previousStart && t < start
  })

  const daily = new Map<string, { orders: number; revenue: number }>()
  for (let i = days - 1; i >= 0; i--) {
    daily.set(dayKey(new Date(now.getTime() - i * DAY_MS)), { orders: 0, revenue: 0 })
  }
  const products = new Map<string, { product_id: string; title: string; quantity: number }>()
  for (const order of current) {
    const day = daily.get(dayKey(order.created_at))
    if (day) {
      day.orders += 1
      day.revenue = round2(day.revenue + Number(order.total ?? 0))
    }
    for (const item of order.items) {
      if (!item.product_id) {
        continue
      }
      const entry = products.get(item.product_id) ?? { product_id: item.product_id, title: item.title ?? item.product_id, quantity: 0 }
      entry.quantity += Number(item.quantity ?? 0)
      products.set(item.product_id, entry)
    }
  }

  return {
    current: summarize(current),
    previous: summarize(previous),
    daily: [...daily.entries()].map(([date, v]) => ({ date, ...v })),
    top_products: [...products.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
  }
}

/** Zamówienia do wysłania: nieanulowane, niezakończone i bez żadnej przesyłki. */
export function awaitingFulfillment(orders: Pick<KpiOrder, "status" | "fulfilled">[]) {
  return orders.filter((o) => isCounted(o) && o.status !== "completed" && o.status !== "archived" && !o.fulfilled).length
}

export type StockLevel = { inventory_item_id: string; sku: string | null; title: string | null; stocked: number; reserved: number }

/** Pozycje magazynowe z dostępną ilością (suma lokalizacji) nie większą niż próg, najpierw najmniejsze. */
export function lowStock(levels: StockLevel[], threshold = LOW_STOCK_THRESHOLD) {
  const items = new Map<string, { inventory_item_id: string; sku: string | null; title: string | null; available: number }>()
  for (const level of levels) {
    const entry = items.get(level.inventory_item_id) ?? { inventory_item_id: level.inventory_item_id, sku: level.sku, title: level.title, available: 0 }
    entry.available += Number(level.stocked ?? 0) - Number(level.reserved ?? 0)
    items.set(level.inventory_item_id, entry)
  }
  const low = [...items.values()].filter((i) => i.available <= threshold).sort((a, b) => a.available - b.available)
  return { count: low.length, items: low.slice(0, 10) }
}
