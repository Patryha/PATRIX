import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

type VariantGraph = {
  id: string
  title: string | null
  sku: string | null
  ean: string | null
  barcode: string | null
  product?: { title: string | null } | null
  inventory_items?: {
    inventory_item_id: string
    required_quantity: number
    inventory?: { sku: string | null; title: string | null; location_levels?: { location_id: string; stocked_quantity: number; reserved_quantity: number }[] } | null
  }[]
}

/**
 * Wyszukanie po zeskanowanym kodzie (EAN, kod kreskowy albo SKU, dokładne dopasowanie): wariant, towar magazynowy
 * i stan w każdej lokalizacji. Punkt integracji dla czytnika w magazynie i przyszłego POS.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const code = typeof req.query.code === "string" ? req.query.code.trim() : ""
  if (!code || code.length > 64) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Podaj kod EAN, kod kreskowy albo SKU.")
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const fields = [
    "id",
    "title",
    "sku",
    "ean",
    "barcode",
    "product.title",
    "inventory_items.inventory_item_id",
    "inventory_items.required_quantity",
    "inventory_items.inventory.sku",
    "inventory_items.inventory.title",
    "inventory_items.inventory.location_levels.location_id",
    "inventory_items.inventory.location_levels.stocked_quantity",
    "inventory_items.inventory.location_levels.reserved_quantity",
  ]
  const [{ data: variants }, { data: locations }] = await Promise.all([
    query.graph({ entity: "product_variant", fields, filters: { $or: [{ ean: code }, { barcode: code }, { sku: code }] } }),
    query.graph({ entity: "stock_location", fields: ["id", "name"] }),
  ])
  const locationName = (id: string) => (locations as { id: string; name: string }[]).find((l) => l.id === id)?.name ?? id
  const matches = (variants as VariantGraph[]).flatMap((v) =>
    (v.inventory_items ?? []).map((link) => ({
      variant_id: v.id,
      product_title: v.product?.title ?? null,
      variant_title: v.title,
      sku: v.sku,
      ean: v.ean,
      inventory_item_id: link.inventory_item_id,
      inventory_title: link.inventory?.title ?? null,
      required_quantity: Number(link.required_quantity),
      stock: (link.inventory?.location_levels ?? []).map((l) => ({
        location_id: l.location_id,
        location: locationName(l.location_id),
        stocked: Number(l.stocked_quantity),
        reserved: Number(l.reserved_quantity),
        available: Number(l.stocked_quantity) - Number(l.reserved_quantity),
      })),
    }))
  )
  res.json({ matches })
}
