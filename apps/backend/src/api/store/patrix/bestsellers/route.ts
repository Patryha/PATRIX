import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const DAYS = 30
const MAX_ORDERS = 2000

/**
 * Najczęściej kupowane produkty z ostatnich 30 dni (liczba sztuk w zamówieniach nieanulowanych).
 * Zwraca tylko identyfikatory: dostępność i publikację sprawdza sklep przez /store/products.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 48)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "status", "items.product_id", "items.quantity"],
    filters: { created_at: { $gte: new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000) } },
    pagination: { take: MAX_ORDERS, order: { created_at: "DESC" } },
  })
  const sold = new Map<string, number>()
  for (const order of orders) {
    if (order.status === "canceled" || order.status === "draft") {
      continue
    }
    for (const item of order.items ?? []) {
      if (item?.product_id) {
        sold.set(item.product_id, (sold.get(item.product_id) ?? 0) + Number(item.quantity ?? 0))
      }
    }
  }
  const product_ids = [...sold.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
  res.setHeader("Cache-Control", "public, max-age=300")
  res.json({ product_ids })
}
