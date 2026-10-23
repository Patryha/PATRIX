import "server-only"
import { cookies } from "next/headers"

const isProd = process.env.NODE_ENV === "production"

export const CART_COOKIE = "patrix_cart"
export const AUTH_COOKIE = "patrix_customer"

const base = { httpOnly: true, sameSite: "lax" as const, secure: isProd, path: "/" }

export async function getCartId() {
  return (await cookies()).get(CART_COOKIE)?.value ?? null
}

export async function setCartId(id: string) {
  ;(await cookies()).set(CART_COOKIE, id, { ...base, maxAge: 60 * 60 * 24 * 30 })
}

export async function clearCartId() {
  ;(await cookies()).delete(CART_COOKIE)
}

export async function getAuthToken() {
  return (await cookies()).get(AUTH_COOKIE)?.value ?? null
}

export async function setAuthToken(token: string) {
  ;(await cookies()).set(AUTH_COOKIE, token, { ...base, maxAge: 60 * 60 * 24 * 7 })
}

export async function clearAuthToken() {
  ;(await cookies()).delete(AUTH_COOKIE)
}

/** Nagłówki uwierzytelnienia klienta dla pojedynczego żądania (token nigdy nie trafia do współdzielonego SDK). */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

export const LAST_ORDER_COOKIE = "patrix_last_order"

/** Potwierdzenie zamówienia pokazujemy tylko w przeglądarce, która je złożyła (bez identyfikatora w adresie). */
export async function setLastOrderId(id: string) {
  ;(await cookies()).set(LAST_ORDER_COOKIE, id, { ...base, maxAge: 60 * 60 })
}

export async function getLastOrderId() {
  return (await cookies()).get(LAST_ORDER_COOKIE)?.value ?? null
}
