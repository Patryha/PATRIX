import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { FALLBACK_HOME } from "../cms/fallback"
import { FALLBACK_LAYOUT, type LayoutContent } from "../cms/layout"
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

/** Opublikowane menu i stopka. */
export async function getLayout(): Promise<LayoutContent> {
  "use cache"
  cacheLife("minutes")
  cacheTag("cms-layout")
  return sdk.client
    .fetch<{ page: { content: LayoutContent } }>("/store/patrix/cms/pages/layout")
    .then((r) => r.page.content)
    .catch(() => FALLBACK_LAYOUT)
}

export type PreviewPage =
  | { page_key: "home"; version: number; content: PageContent }
  | { page_key: "layout"; version: number; content: LayoutContent }

/** Szkic do podglądu (bez cache). Null, gdy token jest nieprawidłowy lub wygasł. */
export async function getPreviewPage(token: string): Promise<PreviewPage | null> {
  return sdk.client
    .fetch<{ page: PreviewPage }>("/store/patrix/cms/preview", { query: { token } })
    .then((r) => r.page)
    .catch(() => null)
}

export async function listBundleIds(limit: number): Promise<string[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("products")
  return sdk.client
    .fetch<{ product_ids: string[] }>("/store/patrix/bundles", { query: { limit } })
    .then((r) => r.product_ids)
    .catch(() => [])
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
