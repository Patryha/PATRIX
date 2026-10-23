import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { snapshotPrices } from "../lib/catalog/price-snapshot"

/** Zapisuje cenę od razu po utworzeniu lub edycji produktu (zadanie cykliczne wyłapuje resztę zmian). */
export default async function productPriceHistory({ event, container }: SubscriberArgs<{ id: string }>) {
  await snapshotPrices(container, [event.data.id])
}

export const config: SubscriberConfig = { event: ["product.created", "product.updated"] }
