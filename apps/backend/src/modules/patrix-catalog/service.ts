import { MedusaService } from "@medusajs/framework/utils"
import Brand from "./models/brand"
import PriceHistoryEntry from "./models/price-history"
import ProductCompliance from "./models/product-compliance"
import VariantCost from "./models/variant-cost"

export const OMNIBUS_WINDOW_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export type PricePoint = { variant_id: string; currency_code: string; amount: number }

class PatrixCatalogService extends MedusaService({ Brand, ProductCompliance, VariantCost, PriceHistoryEntry }) {
  async getComplianceByProduct(productId: string) {
    const [row] = await this.listProductCompliances({ product_id: productId }, { take: 1 })
    return row ?? null
  }

  /** Tworzy lub aktualizuje dane produktu (jeden rekord na produkt). */
  async upsertCompliance(productId: string, data: Record<string, unknown>) {
    const current = await this.getComplianceByProduct(productId)
    if (current) {
      return await this.updateProductCompliances({ id: current.id, ...data })
    }
    return await this.createProductCompliances({ ...data, product_id: productId })
  }

  /**
   * Zapisuje cenę do historii tylko wtedy, gdy różni się od ostatnio zapisanej.
   * Zwraca liczbę nowych wpisów.
   */
  async recordPrices(points: PricePoint[], at = new Date()): Promise<number> {
    if (!points.length) {
      return 0
    }
    const latest = await this.latestPrices(points.map((p) => p.variant_id))
    const changed = points.filter((p) => {
      const last = latest.get(`${p.variant_id}:${p.currency_code}`)
      return last === undefined || last !== Number(p.amount)
    })
    if (changed.length) {
      await this.createPriceHistoryEntries(changed.map((p) => ({ ...p, recorded_at: at })))
    }
    return changed.length
  }

  private async latestPrices(variantIds: string[]) {
    const rows = await this.listPriceHistoryEntries(
      { variant_id: variantIds },
      { order: { recorded_at: "DESC" }, take: null as unknown as number }
    )
    const map = new Map<string, number>()
    for (const row of rows) {
      const key = `${row.variant_id}:${row.currency_code}`
      if (!map.has(key)) {
        map.set(key, Number(row.amount))
      }
    }
    return map
  }

  /**
   * Najniższa cena z okresu `days` dni przed `before` (Omnibus). Uwzględnia cenę obowiązującą
   * na początku okresu, czyli ostatni wpis sprzed okna. Zwraca null, gdy brak historii.
   */
  async lowestPriceInWindow(
    variantId: string,
    currencyCode: string,
    before = new Date(),
    days = OMNIBUS_WINDOW_DAYS
  ): Promise<number | null> {
    const from = new Date(before.getTime() - days * DAY_MS)
    const rows = await this.listPriceHistoryEntries(
      { variant_id: variantId, currency_code: currencyCode, recorded_at: { $lt: before } },
      { order: { recorded_at: "DESC" }, take: null as unknown as number }
    )
    return lowestInWindow(
      rows.map((r) => ({ amount: Number(r.amount), recorded_at: new Date(r.recorded_at) })),
      from
    )
  }
}

/** Czysta funkcja: najniższa cena obowiązująca w oknie [from, ...), wpisy posortowane malejąco po dacie. */
export function lowestInWindow(rowsDesc: { amount: number; recorded_at: Date }[], from: Date): number | null {
  let lowest: number | null = null
  for (const row of rowsDesc) {
    lowest = lowest === null ? row.amount : Math.min(lowest, row.amount)
    if (row.recorded_at <= from) {
      // cena obowiązująca na początku okna; starsze wpisy już nie mają znaczenia
      break
    }
  }
  return lowest
}

export default PatrixCatalogService
