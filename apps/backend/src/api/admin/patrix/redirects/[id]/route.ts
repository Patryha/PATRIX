import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_SEO_MODULE, type PatrixSeoService } from "../../../../../modules/patrix-seo"
import type { SaveRedirectBody } from "../../validators"
import { prepareRedirect } from "../helpers"

export async function POST(req: AuthenticatedMedusaRequest<SaveRedirectBody>, res: MedusaResponse) {
  const seo = req.scope.resolve<PatrixSeoService>(PATRIX_SEO_MODULE)
  await seo.retrieveRedirect(req.params.id)
  const redirect = await seo.updateRedirects({ id: req.params.id, ...(await prepareRedirect(seo, req.validatedBody, req.params.id)) })
  res.json({ redirect })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const seo = req.scope.resolve<PatrixSeoService>(PATRIX_SEO_MODULE)
  await seo.retrieveRedirect(req.params.id)
  await seo.deleteRedirects(req.params.id)
  res.json({ id: req.params.id, object: "seo_redirect", deleted: true })
}
