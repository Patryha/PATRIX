import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { actorOf, cmsOf, pageKeyOf } from "../../../../../helpers"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const draft = await cmsOf(req).restoreToDraft(pageKeyOf(req), req.params.id, actorOf(req))
  res.json({ draft: { ...draft, preview_token_hash: undefined } })
}
