import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/config"

/** Poza produkcją (bez `NEXT_PUBLIC_ALLOW_INDEXING=true`) roboty nie indeksują niczego. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "true") {
    return { rules: { userAgent: "*", disallow: "/" } }
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/koszyk", "/zamowienie", "/konto", "/logowanie", "/rejestracja", "/ulubione", "/szukaj", "/podglad", "/admin"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
