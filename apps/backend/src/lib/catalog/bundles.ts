/**
 * Zestawy PATRIX = natywne „inventory kits” Medusy: wariant zestawu ma kilka pozycji magazynowych
 * (albo jedną w ilości > 1), więc sprzedaż zestawu zdejmuje ze stanu jego składniki.
 */
type Query = { graph: (config: Record<string, unknown>) => Promise<{ data: any[] }> }

export type KitLink = { variant_id: string; inventory_item_id: string; required_quantity: number }

export type BundleItem = { title: string; variant_title: string | null; handle: string | null; quantity: number }

/** Wariant jest zestawem, gdy ma więcej niż jedną pozycję magazynową albo wymaga więcej niż jednej sztuki. */
export function isKit(items: { required_quantity: number }[]): boolean {
  return items.length > 1 || items.some((i) => (i.required_quantity ?? 1) > 1)
}

export function kitVariantIds(links: KitLink[]): string[] {
  const byVariant = new Map<string, KitLink[]>()
  for (const link of links) {
    byVariant.set(link.variant_id, [...(byVariant.get(link.variant_id) ?? []), link])
  }
  return [...byVariant].filter(([, items]) => isKit(items)).map(([id]) => id)
}

/** Skład zestawów produktu, per wariant. Składnik bez opublikowanego produktu nie ma linku (handle = null). */
export async function bundleContents(query: Query, productId: string): Promise<{ variant_id: string; items: BundleItem[] }[]> {
  const { data } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "inventory_items.required_quantity",
      "inventory_items.inventory.title",
      "inventory_items.inventory.variants.id",
      "inventory_items.inventory.variants.title",
      "inventory_items.inventory.variants.product.id",
      "inventory_items.inventory.variants.product.title",
      "inventory_items.inventory.variants.product.handle",
      "inventory_items.inventory.variants.product.status",
    ],
    filters: { product_id: productId },
  })
  return data
    .filter((v) => isKit(v.inventory_items ?? []))
    .map((v) => ({
      variant_id: v.id,
      items: (v.inventory_items ?? []).map((item: any) => {
        // Składnik to inny produkt korzystający z tej samej pozycji magazynowej.
        const component = (item.inventory?.variants ?? []).find((c: any) => c.product?.id && c.product.id !== productId)
        return {
          title: component?.product?.title ?? item.inventory?.title ?? "Składnik zestawu",
          variant_title: component?.title ?? null,
          handle: component?.product?.status === "published" ? component.product.handle : null,
          quantity: item.required_quantity ?? 1,
        }
      }),
    }))
}

/** Identyfikatory opublikowanych produktów, które są zestawami (najnowsze najpierw). */
export async function listBundleProductIds(query: Query, limit: number): Promise<string[]> {
  const { data: links } = await query.graph({
    entity: "product_variant_inventory_item",
    fields: ["variant_id", "inventory_item_id", "required_quantity"],
  })
  const variantIds = kitVariantIds(links as KitLink[])
  if (!variantIds.length) {
    return []
  }
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.id", "product.status", "product.created_at"],
    filters: { id: variantIds },
  })
  const products = new Map<string, number>()
  for (const v of variants) {
    if (v.product?.status === "published") {
      products.set(v.product.id, new Date(v.product.created_at).getTime())
    }
  }
  return [...products]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
}
