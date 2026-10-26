import { ProductGrid } from "@/components/product/product-card"
import { getRecommendations } from "@/lib/data/recommendations"

function Section({ id, title, products }: { id: string; title: string; products: Parameters<typeof ProductGrid>[0]["products"] }) {
  if (!products.length) {
    return null
  }
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <h2 id={id} className="text-2xl font-bold md:text-3xl">
        {title}
      </h2>
      <ProductGrid products={products} />
    </section>
  )
}

/** Rekomendacje na karcie produktu; sekcja bez danych (np. brak zamówień) się nie pokazuje. */
export async function ProductRecommendations({ productId }: { productId: string }) {
  const { boughtTogether, similar } = await getRecommendations([productId])
  return (
    <>
      <Section id="kupowane-razem" title="Często kupowane razem" products={boughtTogether} />
      <Section id="podobne-produkty" title="Podobne produkty" products={similar} />
    </>
  )
}

/** Rekomendacje w koszyku: produkty kupowane razem z tymi, które są w koszyku. */
export async function CartRecommendations({ productIds }: { productIds: string[] }) {
  const { boughtTogether } = await getRecommendations(productIds)
  return <Section id="koszyk-polecane" title="Klienci kupowali też" products={boughtTogether} />
}
