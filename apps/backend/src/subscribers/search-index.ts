import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { invalidateSearchIndex } from "../lib/search-index"

/** Zmiana produktu, wariantu lub kategorii unieważnia indeks wyszukiwarki (zbuduje się przy następnym zapytaniu). */
export default async function searchIndexInvalidation(_: SubscriberArgs<unknown>) {
  invalidateSearchIndex()
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
