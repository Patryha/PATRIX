import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { unitCosts, type VariantInventoryLink } from "../../../../../lib/warehouse"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../../../../modules/patrix-catalog"

const round2 = (n: number) => Math.round(n * 100) / 100

/** Wartość magazynu w cenach zakupu netto (uprawnienie finance:read). Towar bez ceny zakupu jest wykazany osobno. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const locationId = typeof req.query.location_id === "string" && req.query.location_id ? req.query.location_id : undefined
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const levels = await req.scope
    .resolve(Modules.INVENTORY)
    .listInventoryLevels(locationId ? { location_id: locationId } : {}, { take: 20_000 })
  const stocked = levels.filter((l) => Number(l.stocked_quantity) > 0)
  const itemIds = [...new Set(stocked.map((l) => l.inventory_item_id))]
  const [{ data: items }, { data: locations }] = await Promise.all([
    itemIds.length
      ? query.graph({
          entity: "inventory_item",
          fields: ["id", "sku", "title", "variants.id", "variants.inventory_items.inventory_item_id", "variants.inventory_items.required_quantity"],
          filters: { id: itemIds },
        })
      : { data: [] },
    query.graph({ entity: "stock_location", fields: ["id", "name"] }),
  ])
  const variants = new Map<string, VariantInventoryLink>()
  for (const item of items as { variants?: VariantInventoryLink[] }[]) {
    for (const v of item.variants ?? []) {
      variants.set(v.id, v)
    }
  }
  const catalog = req.scope.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const costs = variants.size ? await catalog.listVariantCosts({ variant_id: [...variants.keys()] }) : []
  const unit = unitCosts([...variants.values()], costs.map((c) => ({ variant_id: c.variant_id, purchase_price: Number(c.purchase_price) })))

  const rows = stocked
    .map((l) => {
      const item = (items as { id: string; sku: string | null; title: string | null }[]).find((i) => i.id === l.inventory_item_id)
      const cost = unit.get(l.inventory_item_id) ?? null
      const quantity = Number(l.stocked_quantity)
      return {
        inventory_item_id: l.inventory_item_id,
        sku: item?.sku ?? null,
        title: item?.title ?? null,
        location: (locations as { id: string; name: string }[]).find((x) => x.id === l.location_id)?.name ?? l.location_id,
        quantity,
        unit_cost: cost,
        value: cost === null ? null : round2(cost * quantity),
      }
    })
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
  res.json({
    currency_code: "pln",
    total_value: round2(rows.reduce((s, r) => s + (r.value ?? 0), 0)),
    missing_cost: rows.filter((r) => r.unit_cost === null).length,
    rows,
  })
}
