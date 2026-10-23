import type { Metadata } from "next"
import { Suspense } from "react"
import { SearchForm } from "@/components/layout/search-form"
import { ProductGrid, ProductGridSkeleton } from "@/components/product/product-card"
import { Container } from "@/components/ui/container"
import { listProducts } from "@/lib/data/products"

export const metadata: Metadata = { title: "Wyszukiwarka", robots: { index: false } }

type Props = { searchParams: Promise<{ q?: string | string[] }> }

async function Results({ searchParams }: Props) {
  const raw = (await searchParams).q
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) ?? ""
  if (!q) {
    return <p className="text-muted">Wpisz nazwę produktu, markę lub kod EAN.</p>
  }
  const { products, count } = await listProducts({ q, limit: 24 })
  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="text-muted">
        {count ? `Wyniki dla „${q}”: ${count}` : `Brak wyników dla „${q}”. Sprawdź pisownię lub wpisz krótszą frazę.`}
      </p>
      {products.length ? <ProductGrid products={products} /> : null}
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
