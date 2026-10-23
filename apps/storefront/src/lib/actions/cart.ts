"use server"

import { refresh } from "next/cache"
import { z } from "zod"
import { getDefaultRegion } from "../data/regions"
import { CART_FIELDS } from "../data/cart"
import { sdk } from "../medusa"
import { authHeaders, getCartId, setCartId } from "../session"
import { friendlyError } from "./errors"

export type ActionState = { ok: boolean; message: string } | null

const MAX_QTY = 99

async function getOrCreateCartId(): Promise<string> {
  const existing = await getCartId()
  if (existing) {
    const cart = await sdk.store.cart.retrieve(existing, { fields: "id,completed_at" }, await authHeaders()).catch(() => null)
    if (cart?.cart && !cart.cart.completed_at) {
      return existing
    }
  }
  const region = await getDefaultRegion()
  const { cart } = await sdk.store.cart.create({ region_id: region?.id }, { fields: "id" }, await authHeaders())
  await setCartId(cart.id)
  return cart.id
}

const AddSchema = z.object({ variantId: z.string().min(1).max(100), quantity: z.coerce.number().int().min(1).max(MAX_QTY) })

export async function addToCart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = AddSchema.safeParse({ variantId: formData.get("variantId"), quantity: formData.get("quantity") ?? 1 })
  if (!parsed.success) {
    return { ok: false, message: "Wybierz wariant i liczbę sztuk (1–99)." }
  }
  try {
    const cartId = await getOrCreateCartId()
    await sdk.store.cart.createLineItem(cartId, { variant_id: parsed.data.variantId, quantity: parsed.data.quantity }, { fields: "id" }, await authHeaders())
    refresh()
    return { ok: true, message: "Dodano do koszyka." }
  } catch (e) {
    return { ok: false, message: friendlyError(e, "Nie udało się dodać produktu do koszyka.") }
  }
}

const UpdateSchema = z.object({ lineId: z.string().min(1).max(100), quantity: z.coerce.number().int().min(0).max(MAX_QTY) })

export async function updateLineQuantity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = UpdateSchema.safeParse({ lineId: formData.get("lineId"), quantity: formData.get("quantity") })
  const cartId = await getCartId()
  if (!parsed.success || !cartId) {
    return { ok: false, message: "Nieprawidłowa liczba sztuk." }
  }
  try {
    if (parsed.data.quantity === 0) {
      await sdk.store.cart.deleteLineItem(cartId, parsed.data.lineId, undefined, await authHeaders())
    } else {
      await sdk.store.cart.updateLineItem(cartId, parsed.data.lineId, { quantity: parsed.data.quantity }, { fields: "id" }, await authHeaders())
    }
    refresh()
    return { ok: true, message: parsed.data.quantity === 0 ? "Usunięto produkt z koszyka." : "Zaktualizowano liczbę sztuk." }
  } catch (e) {
    return { ok: false, message: friendlyError(e) }
  }
}

const PromoSchema = z.object({ code: z.string().trim().min(1).max(50) })

export async function applyPromoCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = PromoSchema.safeParse({ code: formData.get("code") })
  const cartId = await getCartId()
  if (!parsed.success || !cartId) {
    return { ok: false, message: "Wpisz kod rabatowy." }
  }
  try {
    // Medusa rozróżnia wielkość liter w kodach; klient często wpisuje małymi, a kody tworzymy wielkimi.
    const headers = await authHeaders()
    const add = (code: string) => sdk.store.cart.addPromotions(cartId, { promo_codes: [code] }, { fields: CART_FIELDS }, headers)
    const upper = parsed.data.code.toUpperCase()
    const { cart } = await add(parsed.data.code).catch((e) => (upper !== parsed.data.code ? add(upper) : Promise.reject(e)))
    const applied = (cart.promotions ?? []).some((p) => p.code?.toLowerCase() === parsed.data.code.toLowerCase())
    refresh()
    return applied ? { ok: true, message: "Kod rabatowy został naliczony." } : { ok: false, message: "Ten kod rabatowy jest nieprawidłowy lub nie dotyczy produktów w koszyku." }
  } catch (e) {
    return { ok: false, message: friendlyError(e) }
  }
}

export async function removePromoCode(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "")
  const cartId = await getCartId()
  if (!code || !cartId) {
    return
  }
  await sdk.store.cart.removePromotions(cartId, { promo_codes: [code] }, { fields: "id" }, await authHeaders()).catch(() => null)
  refresh()
}
