import type { MedusaStoreRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { boughtTogether, similarProducts } from "../../../../lib/recommendations"
import { getRecommendationData } from "../../../../lib/recommendations-data"

const LIMIT = 8
const ID = /^prod_[A-Za-z0-9]{1,40}$/

/**
 * Rekomendacje dla produktu (`product_ids=prod_…`: kupowane razem i podobne) albo koszyka (kilka identyfikatorów:
 * kupowane razem). Tylko opublikowane produkty z kanałów sprzedaży klucza; ceny i dostępność sklep pobiera z /store/products.
 */
export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const raw = typeof req.query.product_ids === "string" ? req.query.product_ids : ""
  const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))]
  if (!ids.length || ids.length > 50 || !ids.every((id) => ID.test(id))) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Podaj od 1 do 50 identyfikatorów produktów.")
  }
  const data = await getRecommendationData(req.scope)
  const keyChannels = req.publishable_key_context?.sales_channel_ids ?? []
  const allowed = new Set(
    [...data.channels.entries()].filter(([, channels]) => !keyChannels.length || channels.some((c) => keyChannels.includes(c))).map(([id]) => id)
  )

  const target = ids.length === 1 ? data.features.get(ids[0]) : undefined
  res.setHeader("Cache-Control", "public, max-age=300")
  res.json({
    bought_together: boughtTogether(data.pairs, ids, LIMIT, allowed),
    similar: target
      ? similarProducts(
          target,
          [...data.features.values()].filter((f) => allowed.has(f.id)),
          LIMIT
        )
      : [],
  })
}
