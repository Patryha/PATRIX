"use server"

import { suggestSearch, type SuggestResponse } from "../data/search"

const EMPTY: SuggestResponse = { products: [], brands: [], categories: [], suggestion: null }

/** Podpowiedzi do pola wyszukiwania (2–100 znaków); błąd wyszukiwarki = brak podpowiedzi, formularz działa dalej. */
export async function getSearchSuggestions(q: unknown): Promise<SuggestResponse> {
  if (typeof q !== "string") {
    return EMPTY
  }
  const phrase = q.trim()
  if (phrase.length < 2 || phrase.length > 100) {
    return EMPTY
  }
  return suggestSearch(phrase).catch(() => EMPTY)
}
