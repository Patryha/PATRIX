import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { sdk } from "../medusa"

/** Region sprzedaży dla rynku polskiego (waluta PLN). */
export async function getDefaultRegion() {
  "use cache"
  cacheLife("hours")
  cacheTag("regions")
  const { regions } = await sdk.store.region.list({ fields: "id,name,currency_code,*countries" })
  return regions.find((r) => r.currency_code === "pln") ?? regions[0] ?? null
}
