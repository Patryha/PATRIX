import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { SaveDraftBody } from "../../../../validators"
import { actorOf, cmsOf, pageKeyOf } from "../../../helpers"

export async function POST(req: AuthenticatedMedusaRequest<SaveDraftBody>, res: MedusaResponse) {
  const draft = await cmsOf(req).saveDraft(pageKeyOf(req), req.validatedBody.content, actorOf(req), req.validatedBody.note)
  res.json({ draft: { ...draft, preview_token_hash: undefined } })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  await cmsOf(req).discardDraft(pageKeyOf(req))
  res.json({ deleted: true })
}
