import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ProductFacts } from "../compliance"

type ProductRow = {
  id: string
  title: string
  status: string
  thumbnail: string | null
  images?: { id: string }[] | null
  variants?: { id: string; sku: string | null; ean: string | null; prices?: { amount: number; currency_code: string }[] | null }[] | null
}

/** Pobiera dane sprzedażowe produktu potrzebne do kontroli kompletności. */
export async function loadProductFacts(container: MedusaContainer, productIds: string[]) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "status", "thumbnail", "images.id", "variants.id", "variants.sku", "variants.ean", "variants.prices.amount", "variants.prices.currency_code"],
    filters: { id: productIds },
  })
  const facts = new Map<string, ProductFacts & { status: string }>()
  for (const p of data as unknown as ProductRow[]) {
    facts.set(p.id, {
      title: p.title,
      status: p.status,
      hasImage: Boolean(p.thumbnail) || (p.images?.length ?? 0) > 0,
      variants: (p.variants ?? []).map((v) => ({
        id: v.id,
        sku: v.sku,
        ean: v.ean,
        hasPrice: (v.prices ?? []).some((pr) => pr.currency_code === "pln" && Number(pr.amount) > 0),
      })),
    })
  }
  return facts
}
