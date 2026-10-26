import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { FALLBACK_HOME } from "../cms/fallback"
import type { PageContent } from "../cms/types"
import { sdk } from "../medusa"

type PageResponse = { page: { version: number; content: PageContent } }

/** Opublikowana strona główna. Zmiany z panelu są widoczne w ciągu kilku minut (cache). */
export async function getHomePage(): Promise<PageContent> {
  "use cache"
  cacheLife("minutes")
  cacheTag("cms-home")
  return sdk.client
    .fetch<PageResponse>("/store/patrix/cms/pages/home")
    .then((r) => r.page.content)
    .catch(() => FALLBACK_HOME)
}

/** Szkic do podglądu (bez cache). Null, gdy token jest nieprawidłowy lub wygasł. */
export async function getPreviewPage(token: string): Promise<{ version: number; content: PageContent } | null> {
  return sdk.client
    .fetch<PageResponse>("/store/patrix/cms/preview", { query: { token } })
    .then((r) => r.page)
    .catch(() => null)
}

export async function listBestsellerIds(limit: number): Promise<string[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("bestsellers")
  return sdk.client
    .fetch<{ product_ids: string[] }>("/store/patrix/bestsellers", { query: { limit } })
    .then((r) => r.product_ids)
    .catch(() => [])
}
