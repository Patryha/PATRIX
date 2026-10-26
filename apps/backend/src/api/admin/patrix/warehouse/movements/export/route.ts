import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { toCsv } from "../../../../../../lib/csv"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../../../../../../modules/patrix-warehouse"

const MAX_EXPORT_ROWS = 10_000
const TYPE_LABEL: Record<string, string> = {
  receipt: "przyjęcie",
  issue: "wydanie",
  adjustment: "korekta",
  count: "inwentaryzacja",
  sale: "sprzedaż",
  transfer: "przesunięcie (MM)",
  return: "zwrot klienta",
}
const DAY = /^\d{4}-\d{2}-\d{2}$/

/** Dziennik ruchów jako CSV dla Excela (okres od–do włącznie, czas polski). */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const param = (key: string) => (typeof req.query[key] === "string" && req.query[key] ? (req.query[key] as string) : undefined)
  const from = param("from")
  const to = param("to")
  if ((from && !DAY.test(from)) || (to && !DAY.test(to))) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Daty w formacie RRRR-MM-DD.")
  }
  const filters: Record<string, unknown> = {}
  for (const key of ["type", "location_id", "inventory_item_id"]) {
    if (param(key)) {
      filters[key] = param(key)
    }
  }
  const range: Record<string, Date> = {}
  if (from) {
    range.$gte = warsawMidnight(from)
  }
  if (to) {
    const next = new Date(`${to}T00:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    range.$lt = warsawMidnight(next.toISOString().slice(0, 10))
  }
  if (Object.keys(range).length) {
    filters.created_at = range
  }

  const warehouse = req.scope.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const [movements, count] = await warehouse.listAndCountStockMovements(filters, { take: MAX_EXPORT_ROWS, order: { created_at: "ASC" } })
  if (count > MAX_EXPORT_ROWS) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, `Za dużo ruchów (${count}). Wybierz krótszy okres (do ${MAX_EXPORT_ROWS} wierszy).`)
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const itemIds = [...new Set(movements.map((m) => m.inventory_item_id))]
  const locationIds = [...new Set(movements.map((m) => m.location_id))]
  const batchIds = [...new Set(movements.flatMap((m) => (m.batch_id ? [m.batch_id] : [])))]
  const [{ data: items }, { data: locations }, batches] = await Promise.all([
    itemIds.length ? query.graph({ entity: "inventory_item", fields: ["id", "sku", "title"], filters: { id: itemIds } }) : { data: [] },
    locationIds.length ? query.graph({ entity: "stock_location", fields: ["id", "name"], filters: { id: locationIds } }) : { data: [] },
    batchIds.length ? warehouse.listStockBatches({ id: batchIds }) : Promise.resolve([]),
  ])

  const csv = toCsv(
    ["data", "rodzaj", "sku", "towar", "lokalizacja", "ilosc", "partia", "data_waznosci", "dokument", "powod"],
    movements.map((m) => {
      const item = (items as { id: string; sku: string | null; title: string | null }[]).find((i) => i.id === m.inventory_item_id)
      const batch = batches.find((b) => b.id === m.batch_id)
      return [
        new Date(m.created_at).toLocaleString("sv-SE", { timeZone: "Europe/Warsaw" }),
        TYPE_LABEL[m.type] ?? m.type,
        item?.sku ?? null,
        item?.title ?? null,
        (locations as { id: string; name: string }[]).find((l) => l.id === m.location_id)?.name ?? m.location_id,
        m.quantity,
        batch?.lot_number ?? null,
        batch?.expiry_date ? new Date(batch.expiry_date).toISOString().slice(0, 10) : null,
        m.document_ref,
        m.reason,
      ]
    })
  )
  const name = `ruchy-magazynowe${from ? `-od-${from}` : ""}${to ? `-do-${to}` : ""}.csv`
  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`)
  res.send(csv)
}

/** Północ danego dnia w Polsce jako chwila UTC (uwzględnia czas letni). */
function warsawMidnight(day: string) {
  const utcMidnight = new Date(`${day}T00:00:00Z`)
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hourCycle: "h23" }).format(utcMidnight))
  // O północy UTC w Polsce jest 01:00 (zima) albo 02:00 (lato): tyle godzin cofamy.
  return new Date(utcMidnight.getTime() - hour * 3_600_000)
}
