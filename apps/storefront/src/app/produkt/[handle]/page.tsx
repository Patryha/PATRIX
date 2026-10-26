import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { RecentlyViewed, TrackRecent } from "@/components/cms/recently-viewed"
import { FavoriteButton } from "@/components/product/favorite-button"
import { ProductFacts } from "@/components/product/product-facts"
import { ProductGallery } from "@/components/product/gallery"
import { VariantPicker } from "@/components/product/variant-picker"
import { Container } from "@/components/ui/container"
import { Skeleton } from "@/components/ui/skeleton"
import { siteUrl } from "@/lib/config"
import { getProductByHandle } from "@/lib/data/products"
import { getFavorites } from "@/lib/favorites"
import { breadcrumbJsonLd, jsonLd, productJsonLd } from "@/lib/seo/json-ld"

type Props = { params: Promise<{ handle: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductByHandle(handle).catch(() => null)
  if (!product) {
    return { title: "Nie znaleziono produktu" }
  }
  const description = product.subtitle ?? product.description?.slice(0, 155) ?? undefined
  return {
    title: product.title,
    description,
    alternates: { canonical: `/produkt/${product.handle}` },
    openGraph: {
      type: "website",
      title: product.title,
      description,
      images: product.thumbnail ? [product.thumbnail] : undefined,
    },
  }
}

async function FavoriteToggle({ handle }: { handle: string }) {
  const favorites = await getFavorites().catch((): string[] => [])
  return <FavoriteButton handle={handle} initial={favorites.includes(handle)} />
}

async function ProductContent({ params }: Props) {
  const { handle } = await params
  const product = await getProductByHandle(handle)
  if (!product) {
    notFound()
  }
  const category = product.categories[0]
  const images = product.images.length ? product.images : product.thumbnail ? [{ id: "thumb", url: product.thumbnail }] : []
  const crumbs = [
    { name: "Strona główna", path: "/" },
    ...(category ? [{ name: category.name, path: `/kategoria/${category.handle}` }] : []),
    { name: product.title, path: `/produkt/${product.handle}` },
  ]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productJsonLd(product, siteUrl)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd(crumbs, siteUrl)) }} />
      <nav aria-label="Ścieżka nawigacji" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 ? <span aria-hidden>/</span> : null}
              {i === crumbs.length - 1 ? (
                <span aria-current="page" className="text-foreground">
                  {c.name}
                </span>
              ) : (
                <Link href={c.path} className="hover:text-accent-strong">
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={images} title={product.title} />
        <div className="flex flex-col gap-4">
          {product.brand ? (
            <Link href={`/marka/${product.brand.handle}`} className="w-fit text-sm font-semibold uppercase tracking-wide text-accent-strong hover:underline">
              {product.brand.name}
            </Link>
          ) : null}
          <h1 className="text-3xl font-extrabold md:text-4xl">{product.title}</h1>
          {product.subtitle ? <p className="text-lg text-muted">{product.subtitle}</p> : null}
          {product.compliance?.name_original ? (
            <p className="text-sm text-muted">
              Nazwa oryginalna: <span lang="de">{product.compliance.name_original}</span>
            </p>
          ) : null}
          <VariantPicker options={product.options} variants={product.variants} lowest30d={product.lowest30d} measure={product.measure} />
          <Suspense fallback={<div className="min-h-11" />}>
            <FavoriteToggle handle={product.handle} />
          </Suspense>
          <ProductFacts compliance={product.compliance} description={product.description} />
        </div>
      </div>
      <TrackRecent handle={product.handle} />
      <div className="pt-8">
        <RecentlyViewed title="Ostatnio oglądane" id="ostatnio-ogladane" exclude={product.handle} />
      </div>
    </>
  )
}

export default function ProductPage(props: Props) {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <Suspense
        fallback={
          <div className="grid gap-8 md:grid-cols-2" role="status" aria-label="Ładowanie produktu">
            <Skeleton className="aspect-square" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          </div>
        }
      >
        <ProductContent {...props} />
      </Suspense>
    </Container>
  )
}
