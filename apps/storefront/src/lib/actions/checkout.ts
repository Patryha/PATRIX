"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"
import { z } from "zod"
import { CART_FIELDS } from "../data/cart"
import { sdk } from "../medusa"
import { authHeaders, clearCartId, getCartId, setLastOrderId } from "../session"
import { AddressSchema, fieldErrors, normalizeNip } from "../validation/checkout"
import { friendlyError } from "./errors"

export type FormState = { ok: boolean; message: string; errors?: Record<string, string>; values?: Record<string, string> } | null

async function requireCartId() {
  const id = await getCartId()
  if (!id) {
    throw new Error("Brak koszyka")
  }
  return id
}

export async function saveAddress(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]))
  const parsed = AddressSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, message: "Popraw zaznaczone pola.", errors: fieldErrors(parsed.error), values: raw }
  }
  const d = parsed.data
  const address = {
    first_name: d.first_name,
    last_name: d.last_name,
    phone: d.phone,
    address_1: d.address_1,
    postal_code: d.postal_code,
    city: d.city,
    country_code: "pl",
  }
  const invoice = d.invoice === "on"
  try {
    await sdk.store.cart.update(
      await requireCartId(),
      {
        email: d.email,
        shipping_address: address,
        // NIP także w adresie rozliczeniowym: przechodzi do zamówienia i jest widoczny w API sklepu (metadata zamówienia nie).
        billing_address: invoice ? { ...address, company: d.company, metadata: { nip: normalizeNip(d.nip ?? "") } } : address,
        metadata: invoice ? { invoice: true, company: d.company, nip: normalizeNip(d.nip ?? "") } : { invoice: false },
      },
      { fields: "id" },
      await authHeaders()
    )
    refresh()
    return { ok: true, message: "Zapisano dane." }
  } catch (e) {
    return { ok: false, message: friendlyError(e, "Nie udało się zapisać danych."), values: raw }
  }
}

const ShippingSchema = z.object({ optionId: z.string().min(1).max(100) })

export async function setShipping(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = ShippingSchema.safeParse({ optionId: formData.get("optionId") })
  if (!parsed.success) {
    return { ok: false, message: "Wybierz sposób dostawy." }
  }
  try {
    await sdk.store.cart.addShippingMethod(await requireCartId(), { option_id: parsed.data.optionId }, { fields: "id" }, await authHeaders())
    refresh()
    return { ok: true, message: "Wybrano dostawę." }
  } catch (e) {
    return { ok: false, message: friendlyError(e, "Ta forma dostawy jest niedostępna dla koszyka.") }
  }
}

const PaymentSchema = z.object({ providerId: z.string().min(1).max(100) })

export async function setPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = PaymentSchema.safeParse({ providerId: formData.get("providerId") })
  if (!parsed.success) {
    return { ok: false, message: "Wybierz sposób płatności." }
  }
  try {
    const { cart } = await sdk.store.cart.retrieve(await requireCartId(), { fields: CART_FIELDS }, await authHeaders())
    await sdk.store.payment.initiatePaymentSession(cart, { provider_id: parsed.data.providerId }, { fields: "id" }, await authHeaders())
    refresh()
    return { ok: true, message: "Wybrano płatność." }
  } catch (e) {
    return { ok: false, message: friendlyError(e, "Nie udało się wybrać płatności.") }
  }
}

export async function placeOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("terms") !== "on") {
    return { ok: false, message: "Zaakceptuj regulamin i zapoznaj się z polityką prywatności.", errors: { terms: "To pole jest wymagane." } }
  }
  let orderId: string
  try {
    const result = await sdk.store.cart.complete(await requireCartId(), { fields: "id" }, await authHeaders())
    if (result.type !== "order") {
      return { ok: false, message: friendlyError(result.error?.message, "Nie udało się złożyć zamówienia. Sprawdź dane i spróbuj ponownie.") }
    }
    orderId = result.order.id
  } catch (e) {
    return { ok: false, message: friendlyError(e, "Nie udało się złożyć zamówienia. Spróbuj ponownie.") }
  }
  await clearCartId()
  await setLastOrderId(orderId)
  redirect("/zamowienie/potwierdzenie")
}
