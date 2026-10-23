import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createPriceListsWorkflow, createProductsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { snapshotPrices } from "../lib/catalog/price-snapshot"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../modules/patrix-catalog"

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
}
