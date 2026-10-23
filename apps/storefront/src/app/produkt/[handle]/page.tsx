import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Badge } from "@/components/ui/badge"
import { Container } from "@/components/ui/container"
import { Price } from "@/components/ui/price"
import { Skeleton } from "@/components/ui/skeleton"
import { getProductByHandle } from "@/lib/data/products"

type Props = { params: Promise<{ handle: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductByHandle(handle).catch(() => null)
  if (!product) {
    return { title: "Nie znaleziono produktu" }
  }
  return {
    title: product.title,
    description: product.subtitle ?? product.description?.slice(0, 155) ?? undefined,
    alternates: { canonical: `/produkt/${product.handle}` },
    openGraph: product.thumbnail ? { images: [product.thumbnail] } : undefined,
  }
}

/** Karta produktu (wersja podstawowa; pełna karta z danymi prawnymi i koszykiem: Etap 2–3). */
async function ProductContent({ params }: Props) {
  const { handle } = await params
  const product = await getProductByHandle(handle)
  if (!product) {
    notFound()
  }
  const image = product.images[0]?.url ?? product.thumbnail
  const category = product.categories[0]
  return (
    <>
      <nav aria-label="Ścieżka nawigacji" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-accent-strong">
              Strona główna
            </Link>
          </li>
          {category ? (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/kategoria/${category.handle}`} className="hover:text-accent-strong">
                  {category.name}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-foreground">
            {product.title}
          </li>
        </ol>
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface">
          {image ? (
            <Image src={image} alt={product.title} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-contain p-6" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">Brak zdjęcia</div>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-extrabold md:text-4xl">{product.title}</h1>
          {product.subtitle ? <p className="text-lg text-muted">{product.subtitle}</p> : null}
          {product.price ? (
            <Price amount={product.price.amount} currency={product.price.currency} size="lg" />
          ) : (
            <p className="text-muted">Cena wkrótce</p>
          )}
          {!product.inStock ? <Badge className="w-fit">Chwilowo niedostępny</Badge> : null}
          {product.description ? (
            <section aria-labelledby="desc-heading" className="flex flex-col gap-2 border-t border-border pt-4">
              <h2 id="desc-heading" className="text-xl font-bold">
                Opis
              </h2>
              <p className="whitespace-pre-line text-foreground">{product.description}</p>
            </section>
          ) : null}
        </div>
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
