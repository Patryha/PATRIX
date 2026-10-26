import { model } from "@medusajs/framework/utils"

/**
 * Wpis na blogu. Treść w prostym formacie tekstowym (akapity, nagłówki ##/###, listy „- ”, **pogrubienie**,
 * [link](/sciezka)); sklep renderuje ją bez HTML z bazy. Adres (slug) jest stały od pierwszej publikacji.
 */
const BlogPost = model
  .define("blog_post", {
    id: model.id({ prefix: "post" }).primaryKey(),
    slug: model.text(),
    title: model.text(),
    excerpt: model.text(),
    body: model.text(),
    cover_url: model.text().nullable(),
    cover_alt: model.text().nullable(),
    /** Uchwyty produktów polecanych pod wpisem (lista). */
    product_handles: model.json(),
    seo_title: model.text().nullable(),
    seo_description: model.text().nullable(),
    status: model.enum(["draft", "published"]).default("draft"),
    published_at: model.dateTime().nullable(),
    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
  })
  .indexes([
    { on: ["slug"], unique: true, where: "deleted_at IS NULL" },
    { on: ["status", "published_at"] },
  ])

export default BlogPost
