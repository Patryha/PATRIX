import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ProductCard, ProductGridSkeleton } from "@/components/product/product-card"
import { buttonClasses } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { removeFavorite } from "@/lib/actions/favorites"
import { listProductsByHandles } from "@/lib/data/products"
import { getAuthToken } from "@/lib/session"
import { getFavorites } from "@/lib/favorites"

export const metadata: Metadata = { title: "Ulubione", robots: { index: false } }

async function FavoritesContent() {
  const [handles, token] = await Promise.all([getFavorites(), getAuthToken()])
  // Produkty wycofane lub nieopublikowane znikają z listy (pobieramy tylko dostępne w sklepie).
  const products = await listProductsByHandles(handles).catch(() => [])
  return (
    <>
      {!token ? (
        <p className="text-muted">
          Ulubione zapisujemy w tej przeglądarce.{" "}
          <Link href="/logowanie?next=/ulubione" className="font-semibold text-accent-strong underline">
            Zaloguj się
          </Link>
          , aby mieć je na każdym urządzeniu.
        </p>
      ) : null}
      {products.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4" aria-label="Ulubione produkty">
          {products.map((product) => (
            <li key={product.id} className="flex flex-col gap-2">
              <ProductCard product={product} />
              <form action={removeFavorite}>
                <input type="hidden" name="handle" value={product.handle} />
                <button type="submit" className={buttonClasses({ variant: "secondary", className: "w-full" })}>
                  Usuń<span className="sr-only"> {product.title} z ulubionych</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border p-8">
          <p className="text-lg">Nie masz jeszcze ulubionych produktów.</p>
          <p className="text-muted">Na karcie produktu wybierz „Dodaj do ulubionych”, aby wrócić do niego później.</p>
          <Link href="/" className={buttonClasses({ variant: "accent" })}>
            Przeglądaj produkty
          </Link>
        </div>
      )}
    </>
  )
}

export default function FavoritesPage() {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <h1 className="text-3xl font-extrabold">Ulubione</h1>
      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <FavoritesContent />
      </Suspense>
    </Container>
  )
}
