import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { actorOf, cmsOf } from "../../cms/helpers"
import type { SaveBlogPostBody } from "../../validators"
import { prepareBlogPost } from "../helpers"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.json({ post: await cmsOf(req).retrieveBlogPost(req.params.id) })
}

export async function POST(req: AuthenticatedMedusaRequest<SaveBlogPostBody>, res: MedusaResponse) {
  const cms = cmsOf(req)
  const existing = await cms.retrieveBlogPost(req.params.id)
  const post = await cms.updateBlogPosts({ id: existing.id, ...(await prepareBlogPost(cms, req.validatedBody, actorOf(req), existing)) })
  res.json({ post })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const cms = cmsOf(req)
  await cms.retrieveBlogPost(req.params.id)
  await cms.deleteBlogPosts(req.params.id)
  res.json({ id: req.params.id, object: "blog_post", deleted: true })
}
