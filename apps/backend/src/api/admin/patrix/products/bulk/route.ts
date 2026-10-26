import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../../modules/patrix-catalog"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../../../../../modules/patrix-security"
import type { BulkProductsBody } from "../../validators"

type Result = { id: string; title: string; ok: boolean; error?: string }

/**
 * Zmiany masowe produktów. Każdy produkt osobno: błąd jednego (np. niekompletne dane przy publikacji)
 * nie blokuje pozostałych, a strażnik publikacji działa jak przy edycji pojedynczej.
 */
export async function POST(req: AuthenticatedMedusaRequest<BulkProductsBody>, res: MedusaResponse) {
  const { product_ids, action, value } = req.validatedBody
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const { data: products } = await query.graph({ entity: "product", fields: ["id", "title", "categories.id"], filters: { id: product_ids } })

  if (action === "brand" && value) {
    await catalog.retrieveBrand(value)
  }
  if ((action === "category_add" || action === "category_remove") && value) {
    const { data } = await query.graph({ entity: "product_category", fields: ["id"], filters: { id: value } })
    if (!data.length) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Nie ma takiej kategorii.")
    }
  }

  const results: Result[] = []
  for (const id of product_ids) {
    const product = products.find((p: { id: string }) => p.id === id)
    if (!product) {
      results.push({ id, title: id, ok: false, error: "Nie ma takiego produktu." })
      continue
    }
    try {
      if (action === "publish" || action === "draft") {
        await updateProductsWorkflow(req.scope).run({ input: { selector: { id }, update: { status: action === "publish" ? "published" : "draft" } } })
      } else if (action === "brand") {
        await catalog.upsertCompliance(id, { brand_id: value ?? null })
      } else {
        const current: string[] = (product.categories ?? []).flatMap((c: { id: string } | null) => (c ? [c.id] : []))
        const category_ids = action === "category_add" ? [...new Set([...current, value!])] : current.filter((c) => c !== value)
        await updateProductsWorkflow(req.scope).run({ input: { selector: { id }, update: { category_ids } } })
      }
      results.push({ id, title: product.title, ok: true })
    } catch (e) {
      results.push({ id, title: product.title, ok: false, error: (e as Error).message })
    }
  }

  const ok = results.filter((r) => r.ok).length
  await req.scope.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE).recordAudit({
    actor_type: "user",
    actor_id: req.auth_context.actor_id,
    action: "catalog.bulk_update",
    metadata: { action, value: value ?? null, ok, failed: results.length - ok },
  })
  res.json({ results, summary: { ok, failed: results.length - ok } })
}
