import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { loadProductFacts } from "../../../../../../lib/catalog/product-facts"
import { checkCompleteness, type ComplianceData } from "../../../../../../lib/compliance"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../../../modules/patrix-catalog"
import type { UpsertComplianceBody } from "../../../validators"

async function report(req: AuthenticatedMedusaRequest, compliance: ComplianceData | null) {
  const facts = (await loadProductFacts(req.scope, [req.params.id])).get(req.params.id)
  if (!facts) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Nie znaleziono produktu ${req.params.id}`)
  }
  return checkCompleteness(compliance, facts)
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const compliance = await catalog.getComplianceByProduct(req.params.id)
  res.json({ compliance, report: await report(req, compliance as ComplianceData | null) })
}

export async function POST(req: AuthenticatedMedusaRequest<UpsertComplianceBody>, res: MedusaResponse) {
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const body = req.validatedBody
  if (body.brand_id) {
    await catalog.retrieveBrand(body.brand_id)
  }
  const previous = await catalog.getComplianceByProduct(req.params.id)
  const result = await report(req, body as ComplianceData)
  const verifiedNow = body.polish_label_verified && !previous?.polish_label_verified

  const compliance = await catalog.upsertCompliance(req.params.id, {
    ...body,
    allergens: body.allergens ?? null,
    clp_hazard_statements: body.clp_hazard_statements ?? null,
    clp_precautionary_statements: body.clp_precautionary_statements ?? null,
    clp_pictograms: body.clp_pictograms ?? null,
    data_status: result.complete ? "verified" : "needs_review",
    ...(verifiedNow ? { reviewed_by: req.auth_context.actor_id, reviewed_at: new Date() } : {}),
    ...(!body.polish_label_verified ? { reviewed_by: null, reviewed_at: null } : {}),
  })
  res.json({ compliance, report: result })
}
