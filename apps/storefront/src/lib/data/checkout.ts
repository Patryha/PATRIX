import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { sdk } from "../medusa"
import { authHeaders } from "../session"

/** Nazwy dostawców płatności widoczne dla klienta. Nieznany dostawca nie jest pokazywany. */
export const PAYMENT_LABELS: Record<string, string> = {
  pp_system_default: "Płatność przy odbiorze (pobranie)",
}

export async function listShippingOptions(cartId: string): Promise<HttpTypes.StoreCartShippingOption[]> {
  return sdk.store.fulfillment
    .listCartOptions({ cart_id: cartId }, await authHeaders())
    .then((r) => r.shipping_options ?? [])
    .catch(() => [])
}

export async function listPaymentProviders(regionId: string) {
  const { payment_providers } = await sdk.store.payment.listPaymentProviders({ region_id: regionId }, await authHeaders())
  return payment_providers.filter((p) => PAYMENT_LABELS[p.id]).map((p) => ({ id: p.id, label: PAYMENT_LABELS[p.id] }))
}
