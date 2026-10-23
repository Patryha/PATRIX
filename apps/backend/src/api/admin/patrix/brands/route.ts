import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../modules/patrix-catalog"
import type { CreateBrandBody } from "../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const q = typeof req.query.q === "string" ? req.query.q.trim() : ""
  const brands = await catalog.listBrands(q ? { q } : {}, { order: { name: "ASC" }, take: 500 })
  res.json({ brands })
}

export async function POST(req: AuthenticatedMedusaRequest<CreateBrandBody>, res: MedusaResponse) {
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const brand = await catalog.createBrands(req.validatedBody)
  res.status(201).json({ brand })
}
