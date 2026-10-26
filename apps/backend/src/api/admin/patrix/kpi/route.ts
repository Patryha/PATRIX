import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { awaitingFulfillment, change, lowStock, parsePeriod, summarizeOrders, type KpiOrder } from "../../../../lib/kpi"
import { hasPermission } from "../../../../lib/permissions"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../modules/patrix-catalog"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../../../modules/patrix-security"

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_ROWS = 5000

type OrderRow = {
  status: string
  created_at: Date | string
  total?: number | null
  fulfillments?: unknown[] | null
  items?: ({ product_id?: string | null; title?: string | null; quantity?: number | null } | null)[] | null
}

const toKpiOrder = (o: OrderRow): KpiOrder => ({
  status: o.status,
  created_at: o.created_at,
  total: o.total == null ? null : Number(o.total),
  fulfilled: (o.fulfillments?.length ?? 0) > 0,
  items: (o.items ?? []).flatMap((i) => (i ? [{ product_id: i.product_id ?? null, title: i.title ?? null, quantity: Number(i.quantity ?? 0) }] : [])),
})

/**
 * Pulpit KPI (uprawnienie order:read). Kwoty sprzedaży tylko dla osób z finance:read,
 * pozostali widzą liczby zamówień, magazyn i jakość danych.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const days = parsePeriod(req.query.days)
  const now = new Date()
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const security = req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const canSeeMoney = hasPermission(await security.getUserPermissions(req.auth_context.actor_id), "finance:read")

  const [{ data: orders }, { data: open }, { data: levels }, { data: products }, customers, compliance] = await Promise.all([
    query.graph({
      entity: "order",
      fields: ["status", "created_at", "total", "items.product_id", "items.title", "items.quantity"],
      filters: { created_at: { $gte: new Date(now.getTime() - 2 * days * DAY_MS) } },
      pagination: { take: MAX_ROWS, order: { created_at: "DESC" } },
    }),
    query.graph({
      entity: "order",
      fields: ["status", "created_at", "fulfillments.id"],
      filters: { status: ["pending", "requires_action"] },
      pagination: { take: MAX_ROWS },
    }),
    query.graph({
      entity: "inventory_level",
      fields: ["inventory_item_id", "stocked_quantity", "reserved_quantity", "inventory_item.sku", "inventory_item.title"],
      pagination: { take: MAX_ROWS },
    }),
    query.graph({ entity: "product", fields: ["status"], pagination: { take: MAX_ROWS } }),
    req.scope.resolve(Modules.CUSTOMER).listAndCountCustomers({ has_account: true, created_at: { $gte: new Date(now.getTime() - days * DAY_MS).toISOString() } }, { take: 1 }),
    catalog.listProductCompliances({}, { select: ["data_status"], take: MAX_ROWS }),
  ])

  const sales = summarizeOrders((orders as OrderRow[]).map(toKpiOrder), days, now)
  const stock = lowStock(
    levels.map((l: any) => ({
      inventory_item_id: l.inventory_item_id,
      sku: l.inventory_item?.sku ?? null,
      title: l.inventory_item?.title ?? null,
      stocked: Number(l.stocked_quantity ?? 0),
      reserved: Number(l.reserved_quantity ?? 0),
    }))
  )
  const countBy = <T>(rows: T[], key: (r: T) => string) =>
    rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [key(r)]: (acc[key(r)] ?? 0) + 1 }), {})
  const money = <T>(value: T) => (canSeeMoney ? value : null)

  res.setHeader("Cache-Control", "private, no-store")
  res.json({
    days,
    currency_code: "pln",
    can_see_money: canSeeMoney,
    orders: { current: sales.current.orders, previous: sales.previous.orders, change: change(sales.current.orders, sales.previous.orders) },
    revenue: money({ current: sales.current.revenue, previous: sales.previous.revenue, change: change(sales.current.revenue, sales.previous.revenue) }),
    average_order_value: money({ current: sales.current.average_order_value, previous: sales.previous.average_order_value }),
    daily: sales.daily.map((d) => ({ date: d.date, orders: d.orders, revenue: money(d.revenue) })),
    top_products: sales.top_products,
    awaiting_fulfillment: awaitingFulfillment((open as OrderRow[]).map(toKpiOrder)),
    new_customers: customers[1],
    low_stock: stock,
    products: countBy(products as { status: string }[], (p) => p.status),
    product_data: countBy(compliance, (c) => c.data_status),
  })
}
