import { siteUrl } from "@/lib/config"
import { listFeedProducts } from "@/lib/data/merchant-feed"
import { buildFeedItems, renderFeed } from "@/lib/seo/merchant-feed"

/** Feed produktów dla Google Merchant Center: adres podpina się w koncie Merchant Center właściciela. */
export async function GET() {
  const items = buildFeedItems(await listFeedProducts(), siteUrl)
  const xml = renderFeed(items, { title: "PATRIX", link: siteUrl, description: "Produkty sklepu PATRIX" })
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  })
}
