import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { invalidateRecommendations } from "../lib/recommendations-data"
import { invalidateSearchIndex } from "../lib/search-index"

/** Zmiana produktu, wariantu lub kategorii unieważnia indeks wyszukiwarki i dane rekomendacji (zbudują się przy następnym zapytaniu). */
export default async function catalogCachesInvalidation(_: SubscriberArgs<unknown>) {
  invalidateSearchIndex()
  invalidateRecommendations()
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.created",
    "product-variant.updated",
    "product-variant.deleted",
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
  ],
}
