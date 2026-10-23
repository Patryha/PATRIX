import type { MedusaContainer } from "@medusajs/framework/types"
import { snapshotPrices } from "../lib/catalog/price-snapshot"

/** Co 15 minut utrwala zmiany cen (także z cenników promocyjnych) na potrzeby dyrektywy Omnibus. */
export default async function snapshotPricesJob(container: MedusaContainer) {
  const recorded = await snapshotPrices(container)
  if (recorded) {
    container.resolve("logger").info(`[patrix] Historia cen: zapisano ${recorded} zmian`)
  }
}

export const config = { name: "patrix-snapshot-prices", schedule: "*/15 * * * *" }
