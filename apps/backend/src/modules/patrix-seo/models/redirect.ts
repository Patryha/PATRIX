import { model } from "@medusajs/framework/utils"

/** Przekierowanie starego adresu sklepu (np. po zmianie uchwytu produktu albo z poprzedniego sklepu). */
const Redirect = model
  .define("seo_redirect", {
    id: model.id({ prefix: "redir" }).primaryKey(),
    from_path: model.text(),
    to_path: model.text(),
    permanent: model.boolean().default(true),
    note: model.text().nullable(),
  })
  .indexes([{ on: ["from_path"], unique: true, where: "deleted_at IS NULL" }])

export default Redirect
