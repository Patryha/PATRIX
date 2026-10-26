import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import { CartSummary } from "@/components/cart/cart-summary"
import { LineQuantity } from "@/components/cart/line-quantity"
import { PromoForm } from "@/components/cart/promo-form"
import { CartRecommendations } from "@/components/product/recommendations"
import { buttonClasses } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { Skeleton } from "@/components/ui/skeleton"
import { retrieveCart } from "@/lib/data/cart"
import { formatPrice } from "@/lib/format"

export const metadata: Metadata = { title: "Koszyk", robots: { index: false } }

async function CartContent() {
  const cart = await retrieveCart()
  const items = [...(cart?.items ?? [])].sort((a, b) => (a.created_at ?? "").toString().localeCompare((b.created_at ?? "").toString()))
  if (!cart || !items.length) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border p-8">
        <p className="text-lg">Twój koszyk jest pusty.</p>
        <Link href="/" className={buttonClasses({ variant: "accent" })}>
          Wróć do zakupów
        </Link>
      </div>
    )
  }
  const currency = cart.currency_code ?? "pln"
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface" aria-label="Produkty w koszyku">
        {items.map((item) => {
          const title = item.product_title ?? item.title
          return (
            <li key={item.id} className="flex gap-4 p-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-surface-muted md:size-24">
                {item.thumbnail ? <Image src={item.thumbnail} alt="" fill sizes="96px" className="object-contain p-1" /> : null}
              </div>
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex flex-col gap-1">
                  <Link href={`/produkt/${item.product_handle}`} className="font-semibold hover:text-accent-strong">
                    {title}
                  </Link>
                  {item.variant_title ? <span className="text-sm text-muted">{item.variant_title}</span> : null}
                  <span className="text-sm text-muted tabular-nums">{formatPrice(item.unit_price ?? 0, currency)} / szt.</span>
                  <LineQuantity lineId={item.id} quantity={item.quantity} title={title} />
                </div>
                <span className="font-display text-lg font-bold tabular-nums sm:text-right">{formatPrice(item.total ?? 0, currency)}</span>
              </div>
            </li>
          )
        })}
      </ul>
      <aside className="flex flex-col gap-4 self-start rounded-lg border border-border bg-surface p-4 lg:sticky lg:top-36" aria-label="Podsumowanie koszyka">
        <PromoForm codes={(cart.promotions ?? []).map((p) => p.code).filter((c): c is string => !!c)} />
        <CartSummary cart={cart} />
        <Link href="/zamowienie" className={buttonClasses({ variant: "accent", size: "lg" })}>
          Przejdź do zamówienia
        </Link>
        <Link href="/" className="text-center text-sm text-accent-strong underline">
          Kontynuuj zakupy
        </Link>
      </aside>
      <div className="lg:col-span-2">
        <Suspense fallback={null}>
          <CartRecommendations productIds={items.flatMap((i) => (i.product_id ? [i.product_id] : []))} />
        </Suspense>
      </div>
    </div>
  )
}

export default function CartPage() {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <h1 className="text-3xl font-extrabold">Koszyk</h1>
      <Suspense
        fallback={
          <div role="status" aria-label="Ładowanie koszyka" className="flex flex-col gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        }
      >
        <CartContent />
      </Suspense>
    </Container>
  )
}
