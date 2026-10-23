import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { sdk } from "../medusa"
import { authHeaders, getCartId } from "../session"

export const CART_FIELDS =
  "id,email,currency_code,region_id,total,subtotal,item_total,item_subtotal,discount_total,shipping_total,tax_total,metadata," +
  "*items,items.product_handle,items.product_title,items.variant_title,items.variant_sku,items.thumbnail,items.unit_price,items.total,items.quantity," +
  "*items.variant,items.variant.manage_inventory,items.variant.allow_backorder,items.variant.inventory_quantity," +
  "*promotions,promotions.code,*shipping_address,*billing_address,*shipping_methods,shipping_methods.name,shipping_methods.amount,shipping_methods.shipping_option_id," +
  "*payment_collection,*payment_collection.payment_sessions"

/** Koszyk bieżącego klienta (z ciasteczka). Nie jest cache'owany: dane per klient. */
export async function retrieveCart(): Promise<HttpTypes.StoreCart | null> {
  const id = await getCartId()
  if (!id) {
    return null
  }
  return sdk.store.cart
    .retrieve(id, { fields: CART_FIELDS }, await authHeaders())
    .then((r) => r.cart)
    .catch(() => null)
}

export function cartItemCount(cart: HttpTypes.StoreCart | null) {
  return (cart?.items ?? []).reduce((sum, i) => sum + i.quantity, 0)
}
