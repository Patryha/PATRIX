import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  deleteInventoryItemWorkflow,
  deletePriceListsWorkflow,
  deleteProductsWorkflow,
  deletePromotionsWorkflow,
  deleteShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../modules/patrix-catalog"
import { PATRIX_CMS_MODULE, type PatrixCmsService } from "../modules/patrix-cms"
import { PATRIX_SEO_MODULE, type PatrixSeoService } from "../modules/patrix-seo"
import { PATRIX_WAREHOUSE_MODULE, type PatrixWarehouseService } from "../modules/patrix-warehouse"

const TEST = "[TEST]"

/**
 * Usuwa dane z `seed-test-catalog` przed startem sprzedaży (lista kontrolna w DEPLOYMENT.md).
 * Bierze pod uwagę tylko rekordy z oznaczeniem [TEST] (produkt musi mieć jednocześnie uchwyt `test-…`
 * i tytuł „[TEST] …”). Bez argumentu `usun` tylko wypisuje, co zostałoby usunięte. Zamówień nie usuwa (Medusa
 * przechowuje je trwale): jeśli zawierają produkty testowe, skrypt je zgłasza do anulowania w panelu.
 */
export default async function removeTestCatalog({ container, args }: ExecArgs) {
  const apply = args.includes("usun")
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const catalog = container.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const warehouse = container.resolve<PatrixWarehouseService>(PATRIX_WAREHOUSE_MODULE)
  const seo = container.resolve<PatrixSeoService>(PATRIX_SEO_MODULE)
  const cms = container.resolve<PatrixCmsService>(PATRIX_CMS_MODULE)

  const { data: candidates } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title", "variants.id", "variants.inventory_items.inventory_item_id"],
    filters: { handle: { $like: "test-%" } },
  })
  const products = candidates.filter((p) => p.title?.startsWith(TEST))
  const variants = products.flatMap((p) => p.variants ?? [])
  const variantIds = variants.map((v) => v.id)
  // Zestaw korzysta z pozycji magazynowych składników, więc identyfikatory mogą się powtarzać.
  const inventoryItemIds = [
    ...new Set(variants.flatMap((v) => (v.inventory_items ?? []).map((i) => i?.inventory_item_id)).filter((id): id is string => !!id)),
  ]

  const priceLists = (await container.resolve(Modules.PRICING).listPriceLists({}, { select: ["id", "title"] })).filter((pl) =>
    pl.title?.startsWith(TEST)
  )
  const shippingOptions = (await container.resolve(Modules.FULFILLMENT).listShippingOptions({ name: `${TEST} Kurier testowy` })).map(
    (o) => o.id
  )
  const promotions = (await container.resolve(Modules.PROMOTION).listPromotions({ code: "TEST10" })).map((p) => p.id)
  const brands = (await catalog.listBrands({ handle: "test-marka" })).filter((b) => b.name.startsWith(TEST))
  const redirects = (await seo.listRedirects({ from_path: "/test-stary-adres" })).filter((r) => r.note?.startsWith(TEST))
  const posts = (await cms.listBlogPosts({ slug: "test-wpis" })).filter((p) => p.title.startsWith(TEST))
  const batches = inventoryItemIds.length ? await warehouse.listStockBatches({ inventory_item_id: inventoryItemIds }) : []
  const movements = inventoryItemIds.length ? await warehouse.listStockMovements({ inventory_item_id: inventoryItemIds }) : []
  const countLines = inventoryItemIds.length ? await warehouse.listStockCountLines({ inventory_item_id: inventoryItemIds }) : []
  const orderLines = products.length
    ? await container.resolve(Modules.ORDER).listOrderLineItems({ product_id: products.map((p) => p.id) })
    : []

  logger.info(
    [
      `Dane testowe${apply ? " do usunięcia" : " (podgląd, nic nie usunięto)"}:`,
      `produkty: ${products.map((p) => p.handle).join(", ") || "brak"}`,
      `pozycje magazynowe: ${inventoryItemIds.length}, partie: ${batches.length}, ruchy: ${movements.length}, pozycje spisu: ${countLines.length}`,
      `cenniki: ${priceLists.length}, dostawa testowa: ${shippingOptions.length}, kod TEST10: ${promotions.length}`,
      `marka: ${brands.length}, przekierowanie: ${redirects.length}, wpis na blogu: ${posts.length}`,
      `pozycje zamówień z produktami testowymi: ${orderLines.length}${orderLines.length ? " (anuluj te zamówienia w panelu; skrypt ich nie usuwa)" : ""}`,
    ].join("\n  ")
  )
  if (!apply) {
    logger.info("Aby usunąć, uruchom ponownie z argumentem usun (npm run remove:test-catalog -- usun).")
    return
  }

  if (priceLists.length) {
    await deletePriceListsWorkflow(container).run({ input: { ids: priceLists.map((pl) => pl.id) } })
  }
  if (products.length) {
    await deleteProductsWorkflow(container).run({ input: { ids: products.map((p) => p.id) } })
  }
  if (inventoryItemIds.length) {
    await deleteInventoryItemWorkflow(container).run({ input: inventoryItemIds })
  }
  await warehouse.deleteStockCountLines(countLines.map((l) => l.id))
  await warehouse.deleteStockMovements(movements.map((m) => m.id))
  await warehouse.deleteStockBatches(batches.map((b) => b.id))
  if (products.length) {
    const compliance = await catalog.listProductCompliances({ product_id: products.map((p) => p.id) })
    await catalog.deleteProductCompliances(compliance.map((c) => c.id))
  }
  if (variantIds.length) {
    const history = await catalog.listPriceHistoryEntries({ variant_id: variantIds })
    await catalog.deletePriceHistoryEntries(history.map((h) => h.id))
    const costs = await catalog.listVariantCosts({ variant_id: variantIds })
    await catalog.deleteVariantCosts(costs.map((c) => c.id))
  }
  await catalog.deleteBrands(brands.map((b) => b.id))
  if (shippingOptions.length) {
    await deleteShippingOptionsWorkflow(container).run({ input: { ids: shippingOptions } })
  }
  if (promotions.length) {
    await deletePromotionsWorkflow(container).run({ input: { ids: promotions } })
  }
  await seo.deleteRedirects(redirects.map((r) => r.id))
  await cms.deleteBlogPosts(posts.map((p) => p.id))
  logger.info("Dane testowe usunięte.")
}
