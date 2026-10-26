/** Ostatnio oglądane produkty: tylko w przeglądarce (localStorage), bez wysyłania danych o przeglądaniu na serwer. */
export const RECENT_KEY = "patrix_recent"
export const RECENT_MAX = 12

export function readRecent(): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]")
    return Array.isArray(raw) ? raw.filter((h): h is string => typeof h === "string" && /^[a-z0-9-]{1,120}$/.test(h)).slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

export function pushRecent(handle: string) {
  try {
    const next = [handle, ...readRecent().filter((h) => h !== handle)].slice(0, RECENT_MAX)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Prywatny tryb przeglądarki lub zablokowana pamięć: funkcja jest opcjonalna.
  }
}
