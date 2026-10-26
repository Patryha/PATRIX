/**
 * Logika magazynu bez dostępu do bazy: kolejność FEFO, przydział z partii, stan daty ważności.
 * FEFO (first expired, first out): najpierw partie z najbliższą datą ważności, partie bez daty na końcu,
 * przy równych datach starsza dostawa pierwsza.
 */
export type BatchLike = { id: string; quantity: number; expiry_date: Date | string | null; received_at: Date | string }
export type Allocation = { batch_id: string; quantity: number }

export const EXPIRY_WARNING_DAYS = 30

const time = (d: Date | string | null) => (d === null ? Number.POSITIVE_INFINITY : new Date(d).getTime())

export function fefoOrder<T extends BatchLike>(batches: T[]): T[] {
  return [...batches].sort((a, b) => time(a.expiry_date) - time(b.expiry_date) || time(a.received_at) - time(b.received_at))
}

/**
 * Rozdziela ilość na partie według FEFO. Część, której nie pokrywają partie (towar sprzed ewidencji partii),
 * zwracamy jako `untracked`, zamiast blokować wydanie.
 */
export function allocateFefo(batches: BatchLike[], quantity: number): { allocations: Allocation[]; untracked: number } {
  let left = quantity
  const allocations: Allocation[] = []
  for (const batch of fefoOrder(batches.filter((b) => b.quantity > 0))) {
    if (left <= 0) {
      break
    }
    const take = Math.min(batch.quantity, left)
    allocations.push({ batch_id: batch.id, quantity: take })
    left -= take
  }
  return { allocations, untracked: left }
}

export type ExpiryState = "expired" | "soon" | "ok"

/** Stan partii względem daty ważności (porównanie dni kalendarzowych w UTC). */
export function expiryState(expiry: Date | string | null, now = new Date(), warnDays = EXPIRY_WARNING_DAYS): ExpiryState | null {
  if (!expiry) {
    return null
  }
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const days = (day(new Date(expiry)) - day(now)) / 86_400_000
  return days < 0 ? "expired" : days <= warnDays ? "soon" : "ok"
}

export type MovementKind = "receipt" | "issue" | "adjustment" | "count"

/** Ilość ze znakiem do zapisania w stanie: przyjęcie +, wydanie -, korekta i różnica spisu ze znakiem. */
export function signedDelta(type: MovementKind, quantity: number): number {
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new Error("Ilość musi być liczbą całkowitą różną od zera.")
  }
  if (type === "adjustment" || type === "count") {
    return quantity
  }
  if (quantity < 0) {
    throw new Error("Dla przyjęcia i wydania podaj ilość dodatnią.")
  }
  return type === "receipt" ? quantity : -quantity
}
