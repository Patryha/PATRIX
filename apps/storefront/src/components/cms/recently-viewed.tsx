"use client"

import { useEffect, useState } from "react"
import { ProductGrid } from "@/components/product/product-card"
import { getRecentProducts } from "@/lib/actions/recent"
import type { ProductSummary } from "@/lib/data/products"
import { pushRecent, readRecent } from "@/lib/recent/store"

/** Sekcja „Ostatnio oglądane”: pojawia się dopiero, gdy klient obejrzał jakieś produkty. */
export function RecentlyViewed({ title, id, exclude }: { title: string; id: string; exclude?: string }) {
  const [products, setProducts] = useState<ProductSummary[]>([])

  useEffect(() => {
    const handles = readRecent().filter((h) => h !== exclude)
    if (!handles.length) {
      return
    }
    let active = true
    getRecentProducts(handles.slice(0, 8)).then((p) => active && setProducts(p))
    return () => {
      active = false
    }
  }, [exclude])

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

/** Zapisuje obejrzany produkt (karta produktu). Nic nie renderuje. */
export function TrackRecent({ handle }: { handle: string }) {
  useEffect(() => {
    pushRecent(handle)
  }, [handle])
  return null
}
