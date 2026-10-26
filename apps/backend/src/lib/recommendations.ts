/**
 * PATRIX: rekomendacje produktów liczone z danych sklepu (bez zewnętrznych usług, bez danych osobowych).
 * - „Często kupowane razem”: współwystępowanie w zamówieniach; para musi wystąpić w co najmniej MIN_SUPPORT
 *   różnych zamówieniach, żeby rekomendacja nie zdradzała zawartości pojedynczego koszyka klienta.
 * - „Podobne produkty”: ta sama kategoria, kolejność według marki, typu i tagów.
 */

export const MIN_SUPPORT = 2

export type OrderBasket = string[]

/** Liczba zamówień, w których produkty wystąpiły razem: produkt → (inny produkt → liczba zamówień). */
export function buildCoPurchase(baskets: OrderBasket[]) {
  const pairs = new Map<string, Map<string, number>>()
  for (const basket of baskets) {
    const unique = [...new Set(basket)]
    for (const a of unique) {
      for (const b of unique) {
        if (a === b) {
          continue
        }
        const row = pairs.get(a) ?? new Map<string, number>()
        row.set(b, (row.get(b) ?? 0) + 1)
        pairs.set(a, row)
      }
    }
  }
  return pairs
}

/** Produkty kupowane razem z podanymi (suma dla kilku produktów, np. koszyka), bez nich samych. */
export function boughtTogether(pairs: Map<string, Map<string, number>>, productIds: string[], limit: number, allowed?: Set<string>) {
  const exclude = new Set(productIds)
  const totals = new Map<string, number>()
  for (const id of productIds) {
    for (const [other, count] of pairs.get(id) ?? []) {
      if (count >= MIN_SUPPORT && !exclude.has(other) && (!allowed || allowed.has(other))) {
        totals.set(other, (totals.get(other) ?? 0) + count)
      }
    }
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id]) => id)
}

export type ProductFeatures = { id: string; categories: string[]; brand: string | null; type: string | null; tags: string[]; created_at: number }

export function similarityScore(a: ProductFeatures, b: ProductFeatures) {
  const shared = (x: string[], y: string[]) => x.filter((v) => y.includes(v)).length
  return (
    shared(a.categories, b.categories) * 3 +
    (a.brand && a.brand === b.brand ? 2 : 0) +
    (a.type && a.type === b.type ? 1 : 0) +
    shared(a.tags, b.tags) * 0.5
  )
}

/**
 * Podobne produkty: przy produkcie z kategorią tylko z tej samej kategorii (marka, typ i tagi ustalają kolejność,
 * żeby np. ciastka nie polecały płynu tej samej marki); przy remisie nowsze.
 */
export function similarProducts(target: ProductFeatures, candidates: ProductFeatures[], limit: number) {
  return candidates
    .filter((c) => c.id !== target.id && (!target.categories.length || c.categories.some((id) => target.categories.includes(id))))
    .map((c) => ({ id: c.id, score: similarityScore(target, c), created_at: c.created_at }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || b.created_at - a.created_at)
    .slice(0, limit)
    .map((c) => c.id)
}
