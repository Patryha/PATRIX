import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/config"
import { listSitemapEntries, type SitemapEntry } from "@/lib/data/sitemap"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await listSitemapEntries().catch((): SitemapEntry[] => [{ path: "/" }])
  return entries.map((e) => ({ url: `${siteUrl}${e.path}`, lastModified: e.lastModified }))
}
