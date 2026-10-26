import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createProductCategoriesWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import { MAIN_CATEGORIES } from "../lib/catalog/categories"
import { DEFAULT_HOME, DEFAULT_LAYOUT, PATRIX_CMS_MODULE, type PatrixCmsService } from "../modules/patrix-cms"
import { PATRIX_SECURITY_MODULE, type PatrixSecurityService } from "../modules/patrix-security"

/**
 * Konfiguracja bazowa PATRIX (idempotentna, bezpieczna dla produkcji):
 * sklep i waluta PLN (ceny brutto), region Polska, VAT 23% jako stawka domyślna, kanały sprzedaży,
 * magazyn główny, profil wysyłki, klucz publikowalny, 12 kategorii głównych i role pracowników.
 * Nie tworzy produktów, cen ani opcji dostaw: to dane biznesowe właściciela.
 */
export default async function seedPatrix({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const storeService = container.resolve(Modules.STORE)
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
  const regionService = container.resolve(Modules.REGION)
  const taxService = container.resolve(Modules.TAX)
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  const pricingService = container.resolve(Modules.PRICING)
  const apiKeyService = container.resolve(Modules.API_KEY)
  const productService = container.resolve(Modules.PRODUCT)
  const security = container.resolve<PatrixSecurityService>(PATRIX_SECURITY_MODULE)

  const [store] = await storeService.listStores()

  logger.info("PATRIX: kanały sprzedaży")
  const channelNames = ["Sklep internetowy PATRIX", "Sklep stacjonarny PATRIX"]
  const existingChannels = await salesChannelService.listSalesChannels({ name: channelNames })
  const missingChannels = channelNames.filter((n) => !existingChannels.some((c) => c.name === n))
  if (missingChannels.length) {
    await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: missingChannels.map((name) => ({
          name,
          description:
            name === "Sklep stacjonarny PATRIX"
              ? "Kanał pod przyszłą synchronizację z kasą/POS (nieaktywny w sklepie internetowym)."
              : "Sprzedaż internetowa na rynek polski.",
        })),
      },
    })
  }
  const [webChannel] = await salesChannelService.listSalesChannels({ name: "Sklep internetowy PATRIX" })

  logger.info("PATRIX: sklep i waluta PLN")
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "PATRIX",
        supported_currencies: [{ currency_code: "pln", is_default: true }],
        default_sales_channel_id: webChannel.id,
      },
    },
  })

  // Ceny w PLN wprowadzamy i prezentujemy jako ceny brutto (z VAT), zgodnie z praktyką B2C.
  const [plnPreference] = await pricingService.listPricePreferences({ attribute: "currency_code", value: "pln" })
  if (!plnPreference) {
    await pricingService.createPricePreferences({ attribute: "currency_code", value: "pln", is_tax_inclusive: true })
  } else if (!plnPreference.is_tax_inclusive) {
    await pricingService.updatePricePreferences({ id: plnPreference.id }, { is_tax_inclusive: true })
  }

  logger.info("PATRIX: region Polska")
  let [region] = await regionService.listRegions({ name: "Polska" })
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Polska",
            currency_code: "pln",
            countries: ["pl"],
            automatic_taxes: true,
            is_tax_inclusive: true,
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    region = result[0]
  }

  logger.info("PATRIX: podatek VAT (PL)")
  const [plTax] = await taxService.listTaxRegions({ country_code: "pl" })
  if (!plTax) {
    await createTaxRegionsWorkflow(container).run({
      input: [
        {
          country_code: "pl",
          provider_id: "tp_system",
          default_tax_rate: { rate: 23, code: "PL-VAT-23", name: "VAT 23%" },
        },
      ],
    })
  }

  logger.info("PATRIX: magazyn główny")
  let [location] = await stockLocationService.listStockLocations({ name: "Magazyn główny" })
  if (!location) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: { locations: [{ name: "Magazyn główny" }] },
    })
    location = result[0]
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: location.id, add: [webChannel.id] },
    })
    await updateStoresWorkflow(container).run({
      input: { selector: { id: store.id }, update: { default_location_id: location.id } },
    })
  }

  logger.info("PATRIX: profil i strefa wysyłki")
  const profiles = await fulfillmentService.listShippingProfiles({ type: "default" })
  if (!profiles.length) {
    await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Standardowy", type: "default" }] },
    })
  }
  const [fulfillmentSet] = await fulfillmentService.listFulfillmentSets({ name: "Dostawa na terenie Polski" })
  if (!fulfillmentSet) {
    const created = await fulfillmentService.createFulfillmentSets({
      name: "Dostawa na terenie Polski",
      type: "shipping",
      service_zones: [{ name: "Polska", geo_zones: [{ country_code: "pl", type: "country" }] }],
    })
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: created.id },
    })
  }

  logger.info("PATRIX: klucz publikowalny storefrontu")
  let [publishableKey] = await apiKeyService.listApiKeys({ title: "Storefront PATRIX", type: "publishable" })
  if (!publishableKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: { api_keys: [{ title: "Storefront PATRIX", type: "publishable", created_by: "" }] },
    })
    publishableKey = result[0]
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: publishableKey.id, add: [webChannel.id] },
    })
  }

  logger.info("PATRIX: kategorie główne")
  const existingCategories = await productService.listProductCategories({
    handle: MAIN_CATEGORIES.map((c) => c.handle),
  })
  const missingCategories = MAIN_CATEGORIES.filter((c) => !existingCategories.some((e) => e.handle === c.handle))
  if (missingCategories.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCategories.map((c) => ({
          name: c.name,
          handle: c.handle,
          is_active: true,
          is_internal: false,
          rank: MAIN_CATEGORIES.findIndex((m) => m.handle === c.handle),
        })),
      },
    })
  }

  logger.info("PATRIX: role pracowników")
  await security.syncSystemRoles()

  logger.info("PATRIX: strona główna, menu i stopka (pierwsza wersja, tylko gdy strona nie ma żadnej)")
  const cms = container.resolve<PatrixCmsService>(PATRIX_CMS_MODULE)
  for (const [key, content] of [
    ["home", DEFAULT_HOME],
    ["layout", DEFAULT_LAYOUT],
  ] as const) {
    const [anyVersion] = await cms.listPageVersions({ page_key: key }, { take: 1, withDeleted: true })
    if (!anyVersion) {
      await cms.saveDraft(key, content, null, "Wersja początkowa (seed)")
      await cms.publishDraft(key, null)
    }
  }

  logger.info(`PATRIX: gotowe. Region: ${region.id}. Klucz publikowalny: ${publishableKey.token}`)
}
