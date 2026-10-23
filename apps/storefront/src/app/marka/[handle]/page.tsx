import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { CatalogListing } from "@/components/catalog/listing"
import { ProductGridSkeleton } from "@/components/product/product-card"
import { Container } from "@/components/ui/container"
import { parseListingParams } from "@/lib/catalog-filters"
import { listBrands, listCatalog } from "@/lib/data/products"

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function getBrand(handle: string) {
  return (await listBrands()).find((b) => b.handle === handle) ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = await getBrand((await params).handle).catch(() => null)
  if (!brand) {
    return { title: "Nie znaleziono marki" }
  }
  return {
    title: brand.name,
    description: `${brand.name}: oryginalne produkty z Niemiec w sklepie PATRIX.`,
    alternates: { canonical: `/marka/${brand.handle}` },
  }
}

async function BrandContent({ params, searchParams }: Props) {
  const brand = await getBrand((await params).handle)
  if (!brand) {
    notFound()
  }
  const [products, listing] = await Promise.all([listCatalog({ ids: brand.product_ids }), searchParams.then(parseListingParams)])
  return (
    <>
      <nav aria-label="Ścieżka nawigacji" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-accent-strong">
              Strona główna
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-foreground">
            {brand.name}
          </li>
        </ol>
      </nav>
      <h1 className="text-3xl font-extrabold md:text-4xl">{brand.name}</h1>
      <CatalogListing
        pathname={`/marka/${brand.handle}`}
        products={products}
        brands={[]}
        showBrandFilter={false}
        params={listing}
        emptyText="Produkty tej marki pojawią się wkrótce."
      />
    </>
  )
}

export default function BrandPage(props: Props) {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <Suspense fallback={<ProductGridSkeleton />}>
        <BrandContent {...props} />
      </Suspense>
    </Container>
  )
}
