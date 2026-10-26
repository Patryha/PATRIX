import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COMPLIANCE_COLUMNS, COMPLIANCE_KEY, mergeCompliance, parseComplianceRow, unknownColumns } from "../../../../../lib/catalog/import"
import { loadProductFacts } from "../../../../../lib/catalog/product-facts"
import { checkCompleteness, type ComplianceData } from "../../../../../lib/compliance"
import { parseCsv, type CsvTable } from "../../../../../lib/csv"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../../modules/patrix-catalog"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../../../../modules/patrix-security"
import type { ImportCsvBody } from "../../validators"

type RowResult = { line: number; handle: string; status: "create" | "update" | "unchanged" | "error"; changed: string[]; errors: string[] }

/**
 * Import danych produktów z CSV. dry_run (domyślnie) tylko sprawdza plik.
 * Zapis jest „wszystko albo nic”: plik z jakimkolwiek błędem nie zmienia danych.
 */
export async function POST(req: AuthenticatedMedusaRequest<ImportCsvBody>, res: MedusaResponse) {
  let table: CsvTable
  try {
    table = parseCsv(req.validatedBody.csv)
  } catch (e) {
    res.status(400).json({ message: (e as Error).message })
    return
  }
  const known = [COMPLIANCE_KEY, ...Object.keys(COMPLIANCE_COLUMNS)]
  const unknown = unknownColumns(table.headers, known)
  if (!table.headers.includes(COMPLIANCE_KEY) || unknown.length) {
    res.status(400).json({
      message: !table.headers.includes(COMPLIANCE_KEY) ? "Brak kolumny uchwyt." : `Nieznane kolumny: ${unknown.join(", ")}. Dozwolone: ${known.join(", ")}.`,
    })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const parsed = table.rows.map(parseComplianceRow)
  const handles = [...new Set(parsed.map((r) => r.handle).filter(Boolean))]
  const brandHandles = [...new Set(parsed.flatMap((r) => (r.brand_handle ? [r.brand_handle] : [])))]
  const [{ data: products }, brands] = await Promise.all([
    handles.length ? query.graph({ entity: "product", fields: ["id", "handle", "status"], filters: { handle: handles } }) : { data: [] },
    brandHandles.length ? catalog.listBrands({ handle: brandHandles }) : Promise.resolve([] as Awaited<ReturnType<PatrixCatalogService["listBrands"]>>),
  ])
  const productIds = products.map((p: { id: string }) => p.id)
  const [existing, facts] = await Promise.all([
    productIds.length ? catalog.listProductCompliances({ product_id: productIds }) : Promise.resolve([] as Awaited<ReturnType<PatrixCatalogService["listProductCompliances"]>>),
    loadProductFacts(req.scope, productIds),
  ])

  const seen = new Set<string>()
  const writes: { productId: string; data: Record<string, unknown> }[] = []
  const rows: RowResult[] = parsed.map((row, i) => {
    const errors = [...row.errors]
    const product = products.find((p: { handle: string }) => p.handle === row.handle)
    if (row.handle && !product) {
      errors.push(`nie ma produktu o uchwycie „${row.handle}”`)
    }
    if (row.handle && seen.has(row.handle)) {
      errors.push("produkt powtórzony w pliku")
    }
    seen.add(row.handle)
    const changes = { ...row.changes }
    if (row.brand_handle) {
      const brand = brands.find((b) => b.handle === row.brand_handle)
      brand ? (changes.brand_id = brand.id) : errors.push(`nie ma marki „${row.brand_handle}”`)
    }
    const current = product ? existing.find((c) => c.product_id === product.id) : undefined
    const merged = mergeCompliance((current as Record<string, unknown> | undefined) ?? null, changes)
    errors.push(...merged.errors)
    if (product?.status === "published" && merged.labelChanged.length) {
      errors.push("produkt jest opublikowany: zmień dane na karcie produktu albo najpierw wycofaj publikację")
    }
    const status = errors.length ? "error" : !merged.changed.length && current ? "unchanged" : current ? "update" : "create"
    if (status === "create" || status === "update") {
      const productFacts = facts.get(product!.id)
      const complete = productFacts ? checkCompleteness(merged.data as ComplianceData, productFacts).complete : false
      writes.push({ productId: product!.id, data: { ...merged.data, data_status: complete ? "verified" : "needs_review" } })
    }
    return { line: i + 2, handle: row.handle, status, changed: merged.changed, errors }
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
  for (const write of writes) {
    await catalog.upsertCompliance(write.productId, write.data)
  }
  await req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).recordAudit({
    actor_type: "user",
    actor_id: req.auth_context.actor_id,
    action: "catalog.import_compliance",
    metadata: { create: summary.create, update: summary.update, unchanged: summary.unchanged },
  })
  res.json({ dry_run: false, applied: true, summary, rows })
}
