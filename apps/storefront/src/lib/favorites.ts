import "server-only"
import { cookies } from "next/headers"
import { FAVORITES_METADATA_KEY, mergeFavorites, parseFavoritesCookie, sanitizeFavorites } from "./favorites-list"
import { sdk } from "./medusa"
import { getAuthToken } from "./session"

/*
 * Ulubione gościa: ciasteczko httpOnly (działa bez JS i bez konta).
 * Ulubione klienta: metadane konta w Medusie, więc są dostępne na każdym urządzeniu.
 */
export const FAVORITES_COOKIE = "patrix_fav"

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 180,
}

type Owner = { kind: "guest" } | { kind: "customer"; token: string; metadata: Record<string, unknown> }

async function customerMetadata(token: string): Promise<Record<string, unknown> | null> {
  return sdk.store.customer
    .retrieve({ fields: "id,metadata" }, { authorization: `Bearer ${token}` })
    .then((r) => (r.customer.metadata ?? {}) as Record<string, unknown>)
    .catch(() => null)
}

async function resolveOwner(): Promise<Owner> {
  const token = await getAuthToken()
  if (token) {
    const metadata = await customerMetadata(token)
    if (metadata) {
      return { kind: "customer", token, metadata }
    }
  }
  return { kind: "guest" }
}

async function guestFavorites() {
  return parseFavoritesCookie((await cookies()).get(FAVORITES_COOKIE)?.value)
}

async function writeCustomer(token: string, metadata: Record<string, unknown>, list: string[]) {
  // Pozostałe metadane klienta zostają bez zmian.
  await sdk.store.customer.update(
    { metadata: { ...metadata, [FAVORITES_METADATA_KEY]: list } },
    { fields: "id" },
    { authorization: `Bearer ${token}` }
  )
}

export async function getFavorites(): Promise<string[]> {
  const owner = await resolveOwner()
  return owner.kind === "customer" ? sanitizeFavorites(owner.metadata[FAVORITES_METADATA_KEY]) : guestFavorites()
}

/** Zmienia listę ulubionych właściciela (gość albo klient) i zwraca nową listę. */
export async function updateFavorites(change: (list: string[]) => string[]): Promise<string[]> {
  const owner = await resolveOwner()
  if (owner.kind === "customer") {
    const next = sanitizeFavorites(change(sanitizeFavorites(owner.metadata[FAVORITES_METADATA_KEY])))
    await writeCustomer(owner.token, owner.metadata, next)
    return next
  }
  const next = sanitizeFavorites(change(await guestFavorites()))
  ;(await cookies()).set(FAVORITES_COOKIE, JSON.stringify(next), cookieOptions)
  return next
}

/** Po zalogowaniu przenosi ulubione gościa na konto i czyści ciasteczko. Błąd nie blokuje logowania. */
export async function attachGuestFavorites(token: string) {
  const guest = await guestFavorites()
  if (!guest.length) {
    return
  }
  const metadata = await customerMetadata(token)
  if (!metadata) {
    return
  }
  try {
    await writeCustomer(token, metadata, mergeFavorites(sanitizeFavorites(metadata[FAVORITES_METADATA_KEY]), guest))
    ;(await cookies()).delete(FAVORITES_COOKIE)
  } catch {
    // Ulubione zostają w ciasteczku; spróbujemy przy kolejnym logowaniu.
  }
}
