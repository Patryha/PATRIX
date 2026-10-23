"use server"

import { redirect } from "next/navigation"
import { sdk } from "../medusa"
import { clearAuthToken, clearCartId, getCartId, setAuthToken } from "../session"
import { fieldErrors } from "../validation/checkout"
import { LoginSchema, RegisterSchema, safeRedirect } from "../validation/account"
import type { FormState } from "./checkout"
import { friendlyError } from "./errors"

/*
 * Logowanie przez API uwierzytelniania Medusy wywoływane bezpośrednio (sdk.client.fetch), a nie sdk.auth.login:
 * SDK jest współdzielone przez wszystkie żądania serwera i nie może przechowywać tokenu konkretnego klienta.
 */
async function emailpass(path: "" | "/register", email: string, password: string) {
  const res = await sdk.client.fetch<{ token?: string }>(`/auth/customer/emailpass${path}`, { method: "POST", body: { email, password } })
  if (!res.token) {
    throw new Error("Unauthorized")
  }
  return res.token
}

/** Koszyk gościa przechodzi na konto po zalogowaniu (zachowuje produkty). */
async function attachCart(token: string) {
  const cartId = await getCartId()
  if (cartId) {
    await sdk.store.cart.transferCart(cartId, { fields: "id" }, { authorization: `Bearer ${token}` }).catch(() => clearCartId())
  }
}

function formValues(formData: FormData) {
  // Hasła nigdy nie wracają do przeglądarki w stanie formularza.
  return Object.fromEntries([...formData.entries()].filter(([k]) => k !== "password").map(([k, v]) => [k, String(v)]))
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = LoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") })
  if (!parsed.success) {
    return { ok: false, message: "Popraw zaznaczone pola.", errors: fieldErrors(parsed.error), values: formValues(formData) }
  }
  try {
    const token = await emailpass("", parsed.data.email, parsed.data.password)
    await setAuthToken(token)
    await attachCart(token)
  } catch (e) {
    return { ok: false, message: friendlyError(e, "Nieprawidłowy e-mail lub hasło."), values: formValues(formData) }
  }
  redirect(safeRedirect(formData.get("next")))
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]))
  const parsed = RegisterSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, message: "Popraw zaznaczone pola.", errors: fieldErrors(parsed.error), values: formValues(formData) }
  }
  const { email, password, first_name, last_name } = parsed.data
  try {
    const registrationToken = await emailpass("/register", email, password)
    await sdk.store.customer.create({ email, first_name, last_name }, {}, { authorization: `Bearer ${registrationToken}` })
    const token = await emailpass("", email, password)
    await setAuthToken(token)
    await attachCart(token)
  } catch (e) {
    const message = friendlyError(e, "Nie udało się utworzyć konta. Spróbuj ponownie.")
    return {
      ok: false,
      message: message.startsWith("Konto z tym") ? "Konto z tym adresem e-mail już istnieje. Zaloguj się." : message,
      values: formValues(formData),
    }
  }
  redirect("/konto")
}

export async function logout() {
  await clearAuthToken()
  // Koszyk należy do konta: po wylogowaniu nie zostaje w przeglądarce (np. na wspólnym komputerze).
  await clearCartId()
  redirect("/")
}
