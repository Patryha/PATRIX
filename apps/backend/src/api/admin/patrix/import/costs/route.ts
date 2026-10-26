import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COST_COLUMNS, parseCostRow, unknownColumns } from "../../../../../lib/catalog/import"
import { parseCsv, type CsvTable } from "../../../../../lib/csv"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../../modules/patrix-catalog"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../../../../modules/patrix-security"
import type { ImportCsvBody } from "../../validators"

type RowResult = { line: number; sku: string; status: "create" | "update" | "unchanged" | "error"; errors: string[] }

/** Import cen zakupu netto po SKU (uprawnienie finance). Zapis „wszystko albo nic”. */
export async function POST(req: AuthenticatedMedusaRequest<ImportCsvBody>, res: MedusaResponse) {
  let table: CsvTable
  try {
    table = parseCsv(req.validatedBody.csv)
  } catch (e) {
    res.status(400).json({ message: (e as Error).message })
    return
  }
  const unknown = unknownColumns(table.headers, [...COST_COLUMNS])
  if (!table.headers.includes("sku") || !table.headers.includes("cena_zakupu") || unknown.length) {
    res.status(400).json({ message: `Wymagane kolumny: sku, cena_zakupu (opcjonalnie dostawca).${unknown.length ? ` Nieznane: ${unknown.join(", ")}.` : ""}` })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const parsed = table.rows.map(parseCostRow)
  const skus = [...new Set(parsed.map((r) => r.sku).filter(Boolean))]
  const { data: variants } = skus.length
    ? await query.graph({ entity: "product_variant", fields: ["id", "sku"], filters: { sku: skus } })
    : { data: [] as { id: string; sku: string }[] }
  const costs = variants.length ? await catalog.listVariantCosts({ variant_id: variants.map((v: { id: string }) => v.id) }) : []

  const seen = new Set<string>()
  const writes: { variantId: string; currentId?: string; purchase_price: number; supplier: string | null }[] = []
  const rows: RowResult[] = parsed.map((row, i) => {
    const errors = [...row.errors]
    const variant = variants.find((v: { sku: string | null }) => v.sku === row.sku)
    if (row.sku && !variant) {
      errors.push(`nie ma wariantu o SKU „${row.sku}”`)
    }
    if (row.sku && seen.has(row.sku)) {
      errors.push("SKU powtórzone w pliku")
    }
    seen.add(row.sku)
    const current = variant ? costs.find((c) => c.variant_id === variant.id) : undefined
    const same = current && Number(current.purchase_price) === row.purchase_price && (current.supplier ?? null) === row.supplier
    const status = errors.length ? "error" : same ? "unchanged" : current ? "update" : "create"
    if (status === "create" || status === "update") {
      writes.push({ variantId: variant!.id, currentId: current?.id, purchase_price: row.purchase_price!, supplier: row.supplier })
    }
    return { line: i + 2, sku: row.sku, status, errors }
  })

  const summary = {
    rows: rows.length,
    create: rows.filter((r) => r.status === "create").length,
    update: rows.filter((r) => r.status === "update").length,
    unchanged: rows.filter((r) => r.status === "unchanged").length,
    errors: rows.filter((r) => r.status === "error").length,
  }
  if (req.validatedBody.dry_run) {
    res.json({ dry_run: true, applied: false, summary, rows })
    return
  }
  if (summary.errors) {
    res.status(400).json({ message: "Plik zawiera błędy. Popraw je i spróbuj ponownie; nic nie zostało zapisane.", summary, rows })
    return
  }
  for (const w of writes) {
    const data = { purchase_price: w.purchase_price, supplier: w.supplier }
    w.currentId
      ? await catalog.updateVariantCosts({ id: w.currentId, ...data })
      : await catalog.createVariantCosts({ variant_id: w.variantId, currency_code: "pln", ...data })
  }
  await req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).recordAudit({
    actor_type: "user",
    actor_id: req.auth_context.actor_id,
    action: "catalog.import_costs",
    metadata: { create: summary.create, update: summary.update, unchanged: summary.unchanged },
  })
  res.json({ dry_run: false, applied: true, summary, rows })
}
