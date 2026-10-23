import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../../../modules/patrix-catalog"

type VariantRow = { id: string; title: string; sku: string | null; prices?: { amount: number; currency_code: string }[] | null }

/** Ceny zakupu i marża brutto wariantów (tylko z uprawnieniem finance). */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const { data } = await query.graph({
    entity: "product",
    fields: ["variants.id", "variants.title", "variants.sku", "variants.prices.amount", "variants.prices.currency_code"],
    filters: { id: req.params.id },
  })
  const variants = (data[0]?.variants ?? []) as VariantRow[]
  const costs = variants.length ? await catalog.listVariantCosts({ variant_id: variants.map((v) => v.id) }) : []
  res.json({
    variants: variants.map((v) => {
      const cost = costs.find((c) => c.variant_id === v.id)
      const price = v.prices?.find((p) => p.currency_code === "pln")
      const purchase = cost ? Number(cost.purchase_price) : null
      const gross = price ? Number(price.amount) : null
      return {
        id: v.id,
        title: v.title,
        sku: v.sku,
        price_gross: gross,
        purchase_price_net: purchase,
        supplier: cost?.supplier ?? null,
      }
    }),
  })
}
