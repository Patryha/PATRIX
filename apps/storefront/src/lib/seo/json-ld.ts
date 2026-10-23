import type { ProductDetail } from "../data/products"

/** Bezpieczna serializacja do <script type="application/ld+json"> (bez możliwości zamknięcia tagu). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

export function productJsonLd(product: ProductDetail, siteUrl: string) {
  const url = `${siteUrl}/produkt/${product.handle}`
  const offers = product.variants
    .filter((v) => v.price)
    .map((v) => ({
      "@type": "Offer",
      url,
      sku: v.sku ?? undefined,
      gtin: v.ean ?? undefined,
      price: v.price!.amount.toFixed(2),
      priceCurrency: v.price!.currency.toUpperCase(),
      availability: v.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    }))
  const first = product.variants[0]
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? product.subtitle ?? undefined,
    image: product.images.length ? product.images.map((i) => i.url) : product.thumbnail ? [product.thumbnail] : undefined,
    sku: product.variants.length === 1 ? (first?.sku ?? undefined) : undefined,
    gtin: product.variants.length === 1 ? (first?.ean ?? undefined) : undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    offers: offers.length ? offers : undefined,
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  }
}
