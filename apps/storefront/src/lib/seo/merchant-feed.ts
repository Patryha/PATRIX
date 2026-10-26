/**
 * Feed produktów dla Google Merchant Center (RSS 2.0 z przestrzenią nazw `g:`), jedna pozycja na wariant.
 * Do feedu trafiają tylko warianty z ceną i zdjęciem: bez nich Google i tak odrzuca pozycję.
 * Wszystkie dane pochodzą z katalogu sklepu, nic nie jest uzupełniane domyślnie.
 */

export type FeedVariant = {
  id: string
  title: string
  sku: string | null
  ean: string | null
  price: { amount: number; currency: string; original: number | null } | null
  inStock: boolean
}

export type FeedProduct = {
  id: string
  title: string
  handle: string
  description: string | null
  subtitle: string | null
  images: string[]
  category: string | null
  brand: string | null
  variants: FeedVariant[]
}

export type FeedItem = {
  id: string
  item_group_id: string | null
  title: string
  description: string
  link: string
  image_link: string
  additional_image_links: string[]
  availability: "in_stock" | "out_of_stock"
  price: string
  sale_price: string | null
  brand: string | null
  gtin: string | null
  mpn: string | null
  identifier_exists: boolean
  product_type: string | null
}

const MAX_TITLE = 150
const MAX_DESCRIPTION = 5000
const MAX_ADDITIONAL_IMAGES = 10

/**
 * GTIN-8/12/13/14 z poprawną cyfrą kontrolną. Kody z puli wewnętrznej (prefiks 2, 02, 04 i 05 w GTIN-12/13)
 * nie są globalne i Google je odrzuca, więc ich nie wysyłamy.
 */
export function validGtin(code: string | null | undefined): string | null {
  const value = (code ?? "").trim()
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) {
    return null
  }
  const digits = value.split("").map(Number)
  const check = digits.pop() as number
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  if ((10 - (sum % 10)) % 10 !== check) {
    return null
  }
  const gtin13 = value.padStart(13, "0")
  if (value.length !== 8 && (/^2/.test(gtin13) || /^0(2|4|5)/.test(gtin13))) {
    return null
  }
  return value
}

const formatPrice = (amount: number, currency: string) => `${amount.toFixed(2)} ${currency.toUpperCase()}`

/** Tekst bez znaczników HTML i nadmiarowych odstępów. */
function plain(text: string) {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

const isDefaultTitle = (title: string) => !title.trim() || /^(default|domyślny)( variant| wariant)?$/i.test(title.trim())

export function buildFeedItems(products: FeedProduct[], siteUrl: string): FeedItem[] {
  const items: FeedItem[] = []
  for (const product of products) {
    // Względne adresy zdjęć (np. z katalogu sklepu) muszą być bezwzględne.
    const [image, ...rest] = product.images.map((url) => new URL(url, siteUrl).toString())
    if (!image) {
      continue
    }
    const description = truncate(plain(product.description || product.subtitle || product.title), MAX_DESCRIPTION)
    const multi = product.variants.length > 1
    for (const variant of product.variants) {
      if (!variant.price) {
        continue
      }
      const { amount, currency, original } = variant.price
      const gtin = validGtin(variant.ean)
      const mpn = variant.sku?.trim() || null
      const suffix = multi && !isDefaultTitle(variant.title) ? ` – ${variant.title}` : ""
      const link = new URL(`/produkt/${encodeURIComponent(product.handle)}`, siteUrl)
      if (multi) {
        link.searchParams.set("wariant", variant.id)
      }
      items.push({
        id: mpn ?? variant.id,
        item_group_id: multi ? product.id : null,
        title: truncate(`${product.title}${suffix}`, MAX_TITLE),
        description,
        link: link.toString(),
        image_link: image,
        additional_image_links: rest.slice(0, MAX_ADDITIONAL_IMAGES),
        availability: variant.inStock ? "in_stock" : "out_of_stock",
        price: formatPrice(original ?? amount, currency),
        sale_price: original ? formatPrice(amount, currency) : null,
        brand: product.brand,
        gtin,
        mpn: product.brand ? mpn : null,
        // Bez GTIN i bez pary marka + MPN produkt nie ma identyfikatorów (np. własne zestawy).
        identifier_exists: !!gtin || (!!product.brand && !!mpn),
        product_type: product.category,
      })
    }
  }
  return items
}

function escapeXml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

const tag = (name: string, value: string | null) => (value ? `<${name}>${escapeXml(value)}</${name}>` : "")

export function renderFeed(items: FeedItem[], channel: { title: string; link: string; description: string }) {
  const body = items
    .map((item) =>
      [
        "<item>",
        tag("g:id", item.id),
        tag("g:item_group_id", item.item_group_id),
        tag("g:title", item.title),
        tag("g:description", item.description),
        tag("g:link", item.link),
        tag("g:image_link", item.image_link),
        ...item.additional_image_links.map((url) => tag("g:additional_image_link", url)),
        tag("g:availability", item.availability),
        tag("g:price", item.price),
        tag("g:sale_price", item.sale_price),
        tag("g:condition", "new"),
        tag("g:brand", item.brand),
        tag("g:gtin", item.gtin),
        tag("g:mpn", item.mpn),
        item.identifier_exists ? "" : tag("g:identifier_exists", "no"),
        tag("g:product_type", item.product_type),
        "</item>",
      ].join("")
    )
    .join("\n")
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    tag("title", channel.title),
    tag("link", channel.link),
    tag("description", channel.description),
    body,
    "</channel>",
    "</rss>",
    "",
  ].join("\n")
}
