import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cmsOf, pageKeyOf, storefrontUrl } from "../../../helpers"

/** Link podglądu szkicu w sklepie (token ważny 60 minut). */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { token, expires_at } = await cmsOf(req).createPreviewToken(pageKeyOf(req))
  res.json({ url: `${storefrontUrl()}/podglad?token=${encodeURIComponent(token)}`, expires_at })
}
