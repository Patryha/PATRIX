import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { actorOf, cmsOf, pageKeyOf } from "../../../helpers"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const published = await cmsOf(req).publishDraft(pageKeyOf(req), actorOf(req))
  res.json({ published })
}
