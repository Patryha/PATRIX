type Rankable = { variant_rank?: number | null; title?: string | null }

const collator = new Intl.Collator("pl", { numeric: true })

/**
 * Stała kolejność wariantów: najpierw kolejność ustawiona w panelu (variant_rank), potem nazwa z porządkiem
 * liczbowym („1 l” przed „2 l”, „200 g” przed „1000 g”). API nie gwarantuje kolejności wariantów utworzonych razem.
 */
export function sortVariants<T extends Rankable>(variants: readonly T[]): T[] {
  return [...variants].sort((a, b) => (a.variant_rank ?? 0) - (b.variant_rank ?? 0) || collator.compare(a.title ?? "", b.title ?? ""))
}
