import type { Metadata } from "next"
import { Suspense } from "react"
import { SearchForm } from "@/components/layout/search-form"
import { CatalogListing } from "@/components/catalog/listing"
import { ProductGridSkeleton } from "@/components/product/product-card"
import { Container } from "@/components/ui/container"
import { parseListingParams } from "@/lib/catalog-filters"
import { listBrands, listCatalog } from "@/lib/data/products"

export const metadata: Metadata = { title: "Wyszukiwarka", robots: { index: false } }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

async function Results({ searchParams }: Props) {
  const raw = await searchParams
  const q = (Array.isArray(raw.q) ? raw.q[0] : raw.q)?.trim().slice(0, 100) ?? ""
  if (!q) {
    return <p className="text-muted">Wpisz nazwę produktu, markę lub kod EAN.</p>
  }
  const [products, brands] = await Promise.all([listCatalog({ q }), listBrands()])
  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="text-muted">
        {products.length ? `Wyniki dla „${q}”` : `Brak wyników dla „${q}”. Sprawdź pisownię lub wpisz krótszą frazę.`}
      </p>
      {products.length ? (
        <CatalogListing
          pathname="/szukaj"
          extra={{ q }}
          products={products}
          brands={brands.map((b) => ({ handle: b.handle, name: b.name, productIds: b.product_ids }))}
          params={parseListingParams(raw)}
          emptyText=""
        />
      ) : null}
    </div>
  )
}

export default function SearchPage(props: Props) {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <h1 className="text-3xl font-extrabold">Wyszukiwarka</h1>
      <SearchForm className="max-w-xl" id="search-page" />
      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <Results {...props} />
      </Suspense>
    </Container>
  )
}
