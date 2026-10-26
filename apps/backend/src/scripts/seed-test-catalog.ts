import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createPriceListsWorkflow,
  createProductsWorkflow,
  createPromotionsWorkflow,
  createShippingOptionsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { snapshotPrices } from "../lib/catalog/price-snapshot"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../modules/patrix-catalog"
import { PATRIX_CMS_MODULE, type PatrixCmsService } from "../modules/patrix-cms"
import { PATRIX_SEO_MODULE, type PatrixSeoService } from "../modules/patrix-seo"

/**
 * KATALOG TESTOWY do testów E2E i pracy lokalnej. To NIE są prawdziwe produkty:
 * nazwy zaczynają się od „[TEST]”, kody EAN pochodzą z puli 200 (numery wewnętrzne, nieprzydzielane produktom),
 * dane producenta są fikcyjne i oznaczone jako testowe. Skrypt odmawia działania na produkcji.
 */
const DAY = 24 * 60 * 60 * 1000

const TEST_MANUFACTURER = {
  manufacturer_name: "[TEST] Producent testowy",
  manufacturer_address: "Adres testowy 1, 00-000 Test",
  manufacturer_contact: "test@example.test",
  manufacturer_in_eu: true,
  polish_label_verified: true,
}

type TestProduct = {
  handle: string
  title: string
  category: string
  image: string
  managed: boolean
  variants: { title: string; sku: string; ean: string; price: number }[]
  compliance: Record<string, unknown>
  salePrice?: number
  /** Zestaw (inventory kit): składniki wskazane przez SKU wariantów utworzonych wcześniej. */
  kitOf?: { sku: string; quantity: number }[]
}

const PRODUCTS: TestProduct[] = [
  {
    handle: "test-zel-do-prania",
    title: "[TEST] Żel do prania kolorów",
    category: "srodki-do-prania",
    image: "/test-assets/produkt-testowy-1.png",
    managed: false,
    variants: [
      { title: "1 l", sku: "TEST-PRANIE-1L", ean: "2000000000015", price: 29.99 },
      { title: "2 l", sku: "TEST-PRANIE-2L", ean: "2000000000022", price: 49.99 },
    ],
    salePrice: 24.99,
    compliance: {
      product_kind: "household_chemical",
      name_original: "[TEST] Colorwaschmittel",
      net_quantity: 1,
      net_quantity_unit: "l",
      ingredients: "[TEST] Skład przykładowy wyłącznie do testów automatycznych.",
      clp_signal_word: "warning",
      clp_hazard_statements: ["[TEST] H319"],
      clp_pictograms: ["GHS07"],
      ufi_code: "TEST-0000-0000-0001",
      usage_instructions: "[TEST] Instrukcja testowa.",
    },
  },
  {
    handle: "test-ciastka-maslane",
    title: "[TEST] Ciastka maślane",
    category: "slodycze-i-przekaski",
    image: "/test-assets/produkt-testowy-2.png",
    managed: false,
    variants: [{ title: "200 g", sku: "TEST-CIASTKA-200", ean: "2000000000039", price: 9.49 }],
    compliance: {
      product_kind: "food",
      net_quantity: 200,
      net_quantity_unit: "g",
      ingredients: "[TEST] Skład przykładowy wyłącznie do testów automatycznych.",
      allergens: ["[TEST] gluten"],
      allergens_confirmed: true,
      nutrition: { energy_kj: 1, energy_kcal: 1, fat: 1, saturates: 1, carbohydrate: 1, sugars: 1, protein: 1, salt: 1 },
    },
  },
  {
    handle: "test-krem-do-rak",
    title: "[TEST] Krem do rąk",
    category: "kosmetyki-i-pielegnacja",
    image: "/test-assets/produkt-testowy-1.png",
    managed: true,
    variants: [{ title: "75 ml", sku: "TEST-KREM-75", ean: "2000000000046", price: 14.99 }],
    compliance: {
      product_kind: "cosmetic",
      net_quantity: 75,
      net_quantity_unit: "ml",
      ingredients: "[TEST] AQUA, GLYCERIN (skład przykładowy)",
      eu_responsible_name: "[TEST] Osoba odpowiedzialna",
      eu_responsible_address: "Adres testowy 2, 00-000 Test",
      cosmetic_pao_months: 12,
    },
  },
  {
    handle: "test-zestaw-kremow",
    title: "[TEST] Zestaw: 2 × Krem do rąk",
    category: "kosmetyki-i-pielegnacja",
    image: "/test-assets/produkt-testowy-2.png",
    managed: true,
    variants: [{ title: "2 × 75 ml", sku: "TEST-ZESTAW-KREM", ean: "2000000000053", price: 26.99 }],
    kitOf: [{ sku: "TEST-KREM-75", quantity: 2 }],
    compliance: {
      product_kind: "cosmetic",
      net_quantity: 150,
      net_quantity_unit: "ml",
      ingredients: "[TEST] AQUA, GLYCERIN (skład przykładowy)",
      eu_responsible_name: "[TEST] Osoba odpowiedzialna",
      eu_responsible_address: "Adres testowy 2, 00-000 Test",
      cosmetic_pao_months: 12,
    },
  },
]

export default async function seedTestCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  if (process.env.NODE_ENV === "production" && process.env.PATRIX_ALLOW_TEST_CATALOG !== "true") {
    throw new Error("Katalog testowy nie może być tworzony na produkcji.")
  }
  const productService = container.resolve(Modules.PRODUCT)
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  const catalog = container.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)

  const [channel] = await salesChannelService.listSalesChannels({ name: "Sklep internetowy PATRIX" })
  const [profile] = await fulfillmentService.listShippingProfiles({ type: "default" })
  if (!channel || !profile) {
    throw new Error("Najpierw uruchom podstawowy seed (npm run seed).")
  }

  let [brand] = await catalog.listBrands({ handle: "test-marka" })
  if (!brand) {
    brand = await catalog.createBrands({ name: "[TEST] Marka testowa", handle: "test-marka", country_code: "de" })
  }

  for (const item of PRODUCTS) {
    const [existing] = await productService.listProducts({ handle: item.handle })
    if (existing) {
      logger.info(`Katalog testowy: ${item.handle} już istnieje`)
      continue
    }
    const [category] = await productService.listProductCategories({ handle: item.category })
    const kitItems = item.kitOf ? await kitInventoryItems(container, item.kitOf) : undefined
    const { result } = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: item.title,
            handle: item.handle,
            status: "draft",
            description: "[TEST] Produkt testowy. Nie jest oferowany do sprzedaży.",
            thumbnail: item.image,
            images: [{ url: item.image }, { url: "/test-assets/produkt-testowy-2.png" }],
            category_ids: category ? [category.id] : [],
            sales_channels: [{ id: channel.id }],
            shipping_profile_id: profile.id,
            options: [{ title: "Wariant", values: item.variants.map((v) => v.title) }],
            variants: item.variants.map((v) => ({
              title: v.title,
              sku: v.sku,
              ean: v.ean,
              manage_inventory: item.managed,
              allow_backorder: false,
              options: { Wariant: v.title },
              prices: [{ amount: v.price, currency_code: "pln" }],
              ...(kitItems ? { inventory_items: kitItems } : {}),
            })),
          },
        ],
      },
    })
    const product = result[0]
    await catalog.upsertCompliance(product.id, { ...TEST_MANUFACTURER, ...item.compliance, brand_id: brand.id, data_status: "verified" })
    await updateProductsWorkflow(container).run({ input: { selector: { id: product.id }, update: { status: "published" } } })

    if (item.salePrice) {
      // Historia cen: cena regularna od 20 dni, potem obniżka (do sprawdzenia informacji Omnibus).
      const variant = (await productService.listProductVariants({ product_id: product.id }, { order: { title: "ASC" } }))[0]
      await catalog.createPriceHistoryEntries({
        variant_id: variant.id,
        currency_code: "pln",
        amount: item.variants[0].price,
        recorded_at: new Date(Date.now() - 20 * DAY),
      })
      await createPriceListsWorkflow(container).run({
        input: {
          price_lists_data: [
            {
              title: `[TEST] Obniżka ${item.handle}`,
              description: "Cennik testowy",
              status: "active",
              prices: [{ amount: item.salePrice, currency_code: "pln", variant_id: variant.id }],
            },
          ],
        },
      })
    }
    logger.info(`Katalog testowy: utworzono ${item.handle}`)
  }
  await snapshotPrices(container)
  await ensureTestShippingOption(container, profile.id)
  await ensureTestPromotion(container)
  await ensureTestRedirect(container)
  await ensureTestBlogPost(container)
}

/** Pozycje magazynowe składników zestawu (wariant zestawu zdejmuje je ze stanu przy sprzedaży). */
async function kitInventoryItems(container: ExecArgs["container"], parts: { sku: string; quantity: number }[]) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  return Promise.all(
    parts.map(async (part) => {
      const { data } = await query.graph({
        entity: "product_variant",
        fields: ["id", "inventory_items.inventory_item_id"],
        filters: { sku: part.sku },
      })
      const inventoryItemId = data[0]?.inventory_items?.[0]?.inventory_item_id
      if (!inventoryItemId) {
        throw new Error(`Składnik zestawu ${part.sku} nie ma pozycji magazynowej (manage_inventory).`)
      }
      return { inventory_item_id: inventoryItemId, required_quantity: part.quantity }
    })
  )
}

/** Testowa forma dostawy (kwota umowna, oznaczona [TEST]): prawdziwe stawki ustala właściciel (OWN-3). */
async function ensureTestShippingOption(container: ExecArgs["container"], profileId: string) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  const name = "[TEST] Kurier testowy"
  const [existing] = await fulfillmentService.listShippingOptions({ name })
  if (existing) {
    return
  }
  const [set] = await fulfillmentService.listFulfillmentSets({ name: "Dostawa na terenie Polski" }, { relations: ["service_zones"] })
  const zone = set?.service_zones?.[0]
  if (!zone) {
    throw new Error("Brak strefy wysyłki: uruchom podstawowy seed (npm run seed).")
  }
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name,
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: zone.id,
        shipping_profile_id: profileId,
        type: { label: "Kurier testowy", description: "[TEST] Dostawa testowa", code: "test-courier" },
        prices: [{ currency_code: "pln", amount: 12.99 }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })
  logger.info("Katalog testowy: utworzono testową formę dostawy")
}

/** Testowy kod rabatowy TEST10 (10% na zamówienie) do testów kuponów. */
async function ensureTestPromotion(container: ExecArgs["container"]) {
  const promotionService = container.resolve(Modules.PROMOTION)
  const [existing] = await promotionService.listPromotions({ code: "TEST10" })
  if (existing) {
    return
  }
  await createPromotionsWorkflow(container).run({
    input: {
      promotionsData: [
        {
          code: "TEST10",
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: { type: "percentage", target_type: "order", allocation: "across", value: 10, currency_code: "pln" },
        },
      ],
    },
  })
  container.resolve(ContainerRegistrationKeys.LOGGER).info("Katalog testowy: utworzono kod TEST10")
}

/** Testowe przekierowanie starego adresu do testów E2E (adres z prefiksem /test-). */
async function ensureTestRedirect(container: ExecArgs["container"]) {
  const seo = container.resolve<PatrixSeoService>(PATRIX_SEO_MODULE)
  const [existing] = await seo.listRedirects({ from_path: "/test-stary-adres" })
  if (!existing) {
    await seo.createRedirects({ from_path: "/test-stary-adres", to_path: "/produkt/test-krem-do-rak", permanent: true, note: "[TEST] przekierowanie do testów E2E" })
  }
}

/** Wpis [TEST] do testów E2E bloga (bez treści udających poradę: tylko opis testu). */
async function ensureTestBlogPost(container: ExecArgs["container"]) {
  const cms = container.resolve<PatrixCmsService>(PATRIX_CMS_MODULE)
  const [existing] = await cms.listBlogPosts({ slug: "test-wpis" })
  if (!existing) {
    await cms.createBlogPosts({
      slug: "test-wpis",
      title: "[TEST] Wpis testowy",
      excerpt: "Wpis do testów automatycznych bloga, niewidoczny po usunięciu katalogu testowego.",
      body: "## Sekcja testowa\n\nAkapit z **pogrubieniem** i linkiem do [kremu testowego](/produkt/test-krem-do-rak).\n\n- punkt pierwszy\n- punkt drugi",
      product_handles: ["test-krem-do-rak"] as unknown as Record<string, unknown>,
      status: "published",
      published_at: new Date(),
    })
  }
}
