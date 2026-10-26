import Link from "next/link"
import type { BundleContents as Bundle } from "@/lib/data/products"

/** „W zestawie”: składniki zestawu z linkami do ich kart (gdy są w sprzedaży). */
export function BundleContents({ bundles, variantTitles }: { bundles: Bundle[]; variantTitles: Record<string, string> }) {
  if (!bundles.length) {
    return null
  }
  return (
    <section aria-labelledby="zestaw" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <h2 id="zestaw" className="text-lg font-bold">
        W zestawie
      </h2>
      {bundles.map((bundle) => (
        <div key={bundle.variant_id} className="flex flex-col gap-1">
          {bundles.length > 1 ? <p className="text-sm font-semibold text-muted">Wariant: {variantTitles[bundle.variant_id]}</p> : null}
          <ul className="flex flex-col gap-1">
            {bundle.items.map((item, i) => {
              const name = item.variant_title ? `${item.title} (${item.variant_title})` : item.title
              return (
                <li key={`${bundle.variant_id}-${i}`} className="flex gap-2">
                  <span className="font-semibold tabular-nums">{item.quantity} ×</span>
                  {item.handle ? (
                    <Link href={`/produkt/${item.handle}`} className="text-accent-strong underline">
                      {name}
                    </Link>
                  ) : (
                    <span>{name}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </section>
  )
}
