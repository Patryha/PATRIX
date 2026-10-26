import "server-only"
import { sdk } from "../medusa"

export type SearchResponse = { product_ids: string[]; partial: boolean; suggestion: string | null }
export type SuggestResponse = {
  products: { id: string; title: string; handle: string; thumbnail: string | null; brand: string | null }[]
  brands: { name: string; handle: string }[]
  categories: { name: string; handle: string }[]
  suggestion: string | null
}

/** Wyniki wyszukiwarki PATRIX (bez pamięci podręcznej: każde wyszukiwanie trafia do statystyk fraz). */
export async function searchProducts(q: string): Promise<SearchResponse> {
  return sdk.client.fetch<SearchResponse>("/store/patrix/search", { query: { q, limit: 120 } })
}

export async function suggestSearch(q: string): Promise<SuggestResponse> {
  return sdk.client.fetch<SuggestResponse>("/store/patrix/search/suggest", { query: { q } })
}
