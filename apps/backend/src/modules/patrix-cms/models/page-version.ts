import { model } from "@medusajs/framework/utils"

/**
 * Wersja strony CMS (np. strony głównej). Dla danej strony istnieje co najwyżej jeden szkic
 * i jedna wersja opublikowana; poprzednie publikacje zostają jako archiwum (historia, przywracanie).
 */
const PageVersion = model
  .define("cms_page_version", {
    id: model.id({ prefix: "cmsv" }).primaryKey(),
    page_key: model.text(),
    version: model.number(),
    status: model.enum(["draft", "published", "archived"]).default("draft"),
    content: model.json(),
    note: model.text().nullable(),
    created_by: model.text().nullable(),
    updated_by: model.text().nullable(),
    published_by: model.text().nullable(),
    published_at: model.dateTime().nullable(),
    // Podgląd szkicu: przechowujemy tylko skrót tokenu (SHA-256), token ważny krótko.
    preview_token_hash: model.text().nullable(),
    preview_expires_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["page_key", "version"], unique: true, where: "deleted_at IS NULL" },
    { on: ["page_key", "status"] },
    { on: ["preview_token_hash"] },
  ])

export default PageVersion
