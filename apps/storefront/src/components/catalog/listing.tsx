import Link from "next/link"
import { ProductGrid } from "@/components/product/product-card"
import { buttonClasses } from "@/components/ui/button"
import { applyListing, listingHref, sortOptions, type BrandFacet, type ListingParams } from "@/lib/catalog-filters"
import type { ProductSummary } from "@/lib/data/products"

type Props = {
  pathname: string
  products: ProductSummary[]
  brands: BrandFacet[]
  params: ListingParams
  /** Parametry zachowywane przy filtrowaniu (np. fraza wyszukiwania). */
  extra?: Record<string, string>
  showBrandFilter?: boolean
  emptyText: string
}

const plural = (n: number) => (n === 1 ? "produkt" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "produkty" : "produktów")

/** Listing z filtrami (marka, dostępność), sortowaniem i stronicowaniem; działa także bez JavaScriptu. */
export function CatalogListing({ pathname, products, brands, params, extra = {}, showBrandFilter = true, emptyText }: Props) {
  const { products: pageItems, total, page, pages, facets } = applyListing(products, brands, params)
  const activeBrands = facets.filter((f) => params.brands.includes(f.handle))
  const hasFilters = params.brands.length > 0 || params.inStock

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <form method="get" action={pathname} className="flex flex-col gap-5 self-start rounded-lg border border-border bg-surface p-4" aria-label="Filtry i sortowanie">
        {Object.entries(extra).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="listing-sort" className="text-sm font-semibold">
            Sortuj
          </label>
          <select
            id="listing-sort"
            name="sort"
            defaultValue={params.sort}
            className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
          >
            {sortOptions(params.defaultSort).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {showBrandFilter && facets.length ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Marka</legend>
            {facets.map((f) => (
              <label key={f.handle} className="flex min-h-9 items-center gap-2 text-sm">
                <input type="checkbox" name="marka" value={f.handle} defaultChecked={params.brands.includes(f.handle)} className="size-5 accent-accent-strong" />
                <span>
                  {f.name} <span className="text-muted">({f.count})</span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Dostępność</legend>
          <label className="flex min-h-9 items-center gap-2 text-sm">
            <input type="checkbox" name="dostepne" value="1" defaultChecked={params.inStock} className="size-5 accent-accent-strong" />
            Tylko dostępne
          </label>
        </fieldset>
        <button type="submit" className={buttonClasses({ variant: "accent" })}>
          Pokaż wyniki
        </button>
        {hasFilters ? (
          <Link href={listingHref(pathname, params, { brands: [], inStock: false, page: 1 }, extra)} className="text-center text-sm text-accent-strong underline">
            Wyczyść filtry
          </Link>
        ) : null}
      </form>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted" aria-live="polite">
            {total} {plural(total)}
          </p>
          {activeBrands.map((b) => (
            <Link
              key={b.handle}
              href={listingHref(pathname, params, { brands: params.brands.filter((x) => x !== b.handle), page: 1 }, extra)}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-surface px-3 text-sm hover:border-accent-strong"
              aria-label={`Usuń filtr marki ${b.name}`}
            >
              {b.name} <span aria-hidden>×</span>
            </Link>
          ))}
        </div>
        {pageItems.length ? (
          <>
            {/* Nagłówek dla czytników ekranu: karty produktów mają h3, więc kolejność nagłówków jest ciągła. */}
            <h2 className="sr-only">Produkty</h2>
            <ProductGrid products={pageItems} />
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted">{hasFilters ? "Brak produktów spełniających wybrane filtry." : emptyText}</p>
        )}
        {pages > 1 ? (
          <nav aria-label="Strony wyników" className="flex flex-wrap items-center justify-center gap-2 pt-4">
            {page > 1 ? (
              <Link href={listingHref(pathname, params, { page: page - 1 }, extra)} className={buttonClasses({ variant: "secondary", size: "sm" })} rel="prev">
                Poprzednia
              </Link>
            ) : null}
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={listingHref(pathname, params, { page: n }, extra)}
                aria-current={n === page ? "page" : undefined}
                className={buttonClasses({ variant: n === page ? "accent" : "secondary", size: "sm", className: "min-w-9" })}
              >
                {n}
              </Link>
            ))}
            {page < pages ? (
              <Link href={listingHref(pathname, params, { page: page + 1 }, extra)} className={buttonClasses({ variant: "secondary", size: "sm" })} rel="next">
                Następna
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  )
}
