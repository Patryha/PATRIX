import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { actorOf, cmsOf, storefrontUrl } from "../cms/helpers"
import type { SaveBlogPostBody } from "../validators"
import { prepareBlogPost } from "./helpers"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const posts = await cmsOf(req).listBlogPosts(
    {},
    { select: ["id", "slug", "title", "status", "published_at", "updated_at"], order: { updated_at: "DESC" }, take: 1000 }
  )
  res.json({ posts, storefront_url: storefrontUrl() })
}

export async function POST(req: AuthenticatedMedusaRequest<SaveBlogPostBody>, res: MedusaResponse) {
  const cms = cmsOf(req)
  const actor = actorOf(req)
  const post = await cms.createBlogPosts({ ...(await prepareBlogPost(cms, req.validatedBody, actor)), created_by: actor })
  res.status(201).json({ post })
}
