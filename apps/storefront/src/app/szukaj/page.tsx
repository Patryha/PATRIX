import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { SearchForm } from "@/components/layout/search-form"
import { CatalogListing } from "@/components/catalog/listing"
import { ProductGridSkeleton } from "@/components/product/product-card"
import { Container } from "@/components/ui/container"
import { parseListingParams } from "@/lib/catalog-filters"
import { listBrands, listCatalog } from "@/lib/data/products"
import { searchProducts } from "@/lib/data/search"

export const metadata: Metadata = { title: "Wyszukiwarka", robots: { index: false } }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

async function Results({ searchParams }: Props) {
  const raw = await searchParams
  const q = (Array.isArray(raw.q) ? raw.q[0] : raw.q)?.trim().slice(0, 100) ?? ""
  if (!q) {
    return <p className="text-muted">Wpisz nazwę produktu, markę lub kod EAN.</p>
  }
  const result = await searchProducts(q).catch(() => null)
  if (!result) {
    return (
      <p role="alert" className="text-muted">
        Wyszukiwarka jest chwilowo niedostępna. Spróbuj ponownie za chwilę.
      </p>
    )
  }
  const [found, brands] = await Promise.all([listCatalog({ ids: result.product_ids }), listBrands()])
  // Sklep zwraca produkty w swojej kolejności; przywracamy kolejność trafności z wyszukiwarki.
  const rank = new Map(result.product_ids.map((id, i) => [id, i]))
  const products = [...found].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))

  const heading = !products.length
    ? `Brak wyników dla „${q}”.`
    : result.partial
      ? `Nie znaleźliśmy produktów pasujących do całej frazy „${q}”. Pokazujemy najbliższe wyniki.`
      : `Wyniki dla „${q}”`
  return (
    <div className="flex flex-col gap-4">
      <div aria-live="polite" className="flex flex-col gap-1">
        <p className="text-muted">{heading}</p>
        {result.suggestion ? (
          <p>
            Czy chodziło Ci o:{" "}
            <Link href={`/szukaj?q=${encodeURIComponent(result.suggestion)}`} className="font-semibold text-accent-strong underline">
              {result.suggestion}
            </Link>
            ?
          </p>
        ) : !products.length ? (
          <p className="text-muted">Sprawdź pisownię lub wpisz krótszą frazę.</p>
        ) : null}
      </div>
      {products.length ? (
        <CatalogListing
          pathname="/szukaj"
          extra={{ q }}
          products={products}
          brands={brands.map((b) => ({ handle: b.handle, name: b.name, productIds: b.product_ids }))}
          params={parseListingParams(raw, "relevance")}
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
