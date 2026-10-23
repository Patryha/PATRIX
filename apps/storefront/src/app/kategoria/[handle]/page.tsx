import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ProductGrid, ProductGridSkeleton } from "@/components/product/product-card"
import { Container } from "@/components/ui/container"
import { getCategoryByHandle } from "@/lib/data/categories"
import { listProducts } from "@/lib/data/products"

type Props = { params: Promise<{ handle: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const category = await getCategoryByHandle(handle).catch(() => null)
  if (!category) {
    return { title: "Nie znaleziono kategorii" }
  }
  return {
    title: category.name,
    description: category.description || `${category.name}: oryginalne produkty z Niemiec w sklepie PATRIX.`,
    alternates: { canonical: `/kategoria/${category.handle}` },
  }
}

async function CategoryContent({ params }: Props) {
  const { handle } = await params
  const category = await getCategoryByHandle(handle)
  if (!category) {
    notFound()
  }
  const { products, count } = await listProducts({ categoryId: category.id, limit: 24 })
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
            {category.name}
          </li>
        </ol>
      </nav>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold md:text-4xl">{category.name}</h1>
        {category.description ? <p className="max-w-2xl text-muted">{category.description}</p> : null}
        <p className="text-sm text-muted" aria-live="polite">
          {count === 1 ? "1 produkt" : `${count} produktów`}
        </p>
      </header>
      {category.category_children?.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Podkategorie">
          {category.category_children.map((child) => (
            <li key={child.id}>
              <Link
                href={`/kategoria/${child.handle}`}
                className="inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium hover:border-accent-strong hover:text-accent-strong"
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted">
          W tej kategorii nie ma jeszcze produktów.
        </p>
      )}
    </>
  )
}

export default function CategoryPage(props: Props) {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <Suspense fallback={<ProductGridSkeleton />}>
        <CategoryContent {...props} />
      </Suspense>
    </Container>
  )
}
