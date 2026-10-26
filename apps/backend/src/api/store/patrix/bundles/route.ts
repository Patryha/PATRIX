import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { listBundleProductIds } from "../../../../lib/catalog/bundles"

/** Opublikowane zestawy (warianty z kilkoma pozycjami magazynowymi), najnowsze najpierw. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 48)
  const product_ids = await listBundleProductIds(req.scope.resolve(ContainerRegistrationKeys.QUERY), limit)
  res.setHeader("Cache-Control", "public, max-age=300")
  res.json({ product_ids })
}
