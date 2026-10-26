/** Ulubione: lista uchwytów produktów (najnowsze na początku). Wspólne reguły dla ciasteczka gościa i konta klienta. */
export const FAVORITES_MAX = 60
export const FAVORITES_METADATA_KEY = "patrix_favorites"

const HANDLE = /^[a-z0-9][a-z0-9-]{0,119}$/

export function isHandle(value: unknown): value is string {
  return typeof value === "string" && HANDLE.test(value)
}

/** Bezpieczne odczytanie listy z niezaufanego źródła (ciasteczko, metadane): odrzuca błędne wpisy i duplikaty. */
export function sanitizeFavorites(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return [...new Set(raw.filter(isHandle))].slice(0, FAVORITES_MAX)
}

export function parseFavoritesCookie(value: string | undefined | null): string[] {
  if (!value) {
    return []
  }
  try {
    return sanitizeFavorites(JSON.parse(value))
  } catch {
    return []
  }
}

export function toggleHandle(list: string[], handle: string): { list: string[]; favorite: boolean } {
  if (list.includes(handle)) {
    return { list: list.filter((h) => h !== handle), favorite: false }
  }
  return { list: [handle, ...list].slice(0, FAVORITES_MAX), favorite: true }
}

/** Po zalogowaniu: najpierw ulubione z konta, potem dodane jako gość (bez duplikatów, do limitu). */
export function mergeFavorites(account: string[], guest: string[]): string[] {
  return sanitizeFavorites([...account, ...guest.filter((h) => !account.includes(h))])
}
