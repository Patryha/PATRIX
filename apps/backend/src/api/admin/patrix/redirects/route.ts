import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PATRIX_SEO_MODULE, type PatrixSeoService } from "../../../../modules/patrix-seo"
import type { SaveRedirectBody } from "../validators"
import { prepareRedirect } from "./helpers"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const seo = req.scope.resolve<PatrixSeoService>(PATRIX_SEO_MODULE)
  res.json({ redirects: await seo.listRedirects({}, { order: { from_path: "ASC" }, take: 10_000 }) })
}

export async function POST(req: AuthenticatedMedusaRequest<SaveRedirectBody>, res: MedusaResponse) {
  const seo = req.scope.resolve<PatrixSeoService>(PATRIX_SEO_MODULE)
  const redirect = await seo.createRedirects(await prepareRedirect(seo, req.validatedBody))
  res.status(201).json({ redirect })
}
