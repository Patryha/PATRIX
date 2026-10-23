import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Price } from "@/components/ui/price"
import type { ProductSummary } from "@/lib/data/products"

export function ProductCard({ product, priority = false }: { product: ProductSummary; priority?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-[box-shadow,transform,border-color] duration-200 ease-patrix hover:-translate-y-0.5 hover:border-accent hover:shadow-lg focus-within:border-accent">
      <div className="relative aspect-square bg-surface-muted">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-4 transition-transform duration-300 ease-patrix group-hover:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">Brak zdjęcia</div>
        )}
        {/* Znaczek „Promocja” dopiero z najniższą ceną z 30 dni na karcie (Omnibus), więc tu go nie ma. */}
        {!product.inStock ? <Badge className="absolute left-2 top-2">Chwilowo niedostępny</Badge> : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-sans text-base font-semibold leading-snug">
          {/* Rozciągnięty link: cała karta jest klikalna, a czytnik ekranu ogłasza tylko nazwę. */}
          <Link href={`/produkt/${product.handle}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {product.title}
          </Link>
        </h3>
        {product.subtitle ? <p className="line-clamp-1 text-sm text-muted">{product.subtitle}</p> : null}
        <div className="mt-auto pt-2">
          {product.price ? (
            <Price amount={product.price.amount} currency={product.price.currency} size="sm" />
          ) : (
            <span className="text-sm text-muted">Cena wkrótce</span>
          )}
        </div>
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface" aria-hidden>
      <div className="skeleton aspect-square" />
      <div className="flex flex-col gap-2 p-4">
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="skeleton h-4 w-2/5 rounded" />
        <div className="skeleton mt-3 h-5 w-1/3 rounded" />
      </div>
    </div>
  )
}

export function ProductGrid({ products }: { products: ProductSummary[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4" role="status" aria-label="Ładowanie produktów">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}
