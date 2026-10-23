import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { checkCompleteness, type ComplianceData } from "../compliance"
import { PATRIX_CATALOG_MODULE, type PatrixCatalogService } from "../../modules/patrix-catalog"
import { loadProductFacts } from "./product-facts"

export const PRODUCT_DATA_INCOMPLETE = "PRODUCT_DATA_INCOMPLETE"

/**
 * Blokuje publikację produktów z niekompletnymi danymi (prawnymi i sprzedażowymi).
 * Rzuca błąd, który wycofuje cały workflow (zmiana nie zostaje zapisana).
 */
export async function assertPublishable(container: MedusaContainer, products: { id: string; status?: string | null }[]) {
  const published = products.filter((p) => p.status === "published").map((p) => p.id)
  if (!published.length) {
    return
  }
  const catalog = container.resolve<PatrixCatalogService>(PATRIX_CATALOG_MODULE)
  const [facts, compliance] = await Promise.all([
    loadProductFacts(container, published),
    catalog.listProductCompliances({ product_id: published }),
  ])
  const problems: string[] = []
  for (const id of published) {
    const productFacts = facts.get(id)
    if (!productFacts) {
      continue
    }
    const data = compliance.find((c) => c.product_id === id) as ComplianceData | undefined
    const report = checkCompleteness(data ?? null, productFacts)
    if (!report.complete) {
      problems.push(`${productFacts.title ?? id}: ${report.missing.map((m) => m.message).join(" ")}`)
    }
  }
  if (problems.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Nie można opublikować produktu z niekompletnymi danymi. ${problems.join(" | ")}`,
      PRODUCT_DATA_INCOMPLETE
    )
  }
}
