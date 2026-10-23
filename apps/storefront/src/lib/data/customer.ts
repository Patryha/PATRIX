import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { sdk } from "../medusa"
import { authHeaders, getAuthToken } from "../session"

/** Zalogowany klient albo null (brak lub nieważny token). */
export async function retrieveCustomer(): Promise<HttpTypes.StoreCustomer | null> {
  if (!(await getAuthToken())) {
    return null
  }
  return sdk.store.customer
    .retrieve({ fields: "id,email,first_name,last_name,phone,*addresses" }, await authHeaders())
    .then((r) => r.customer)
    .catch(() => null)
}

export async function listCustomerOrders(): Promise<HttpTypes.StoreOrder[]> {
  return sdk.store.order
    .list({ limit: 50, order: "-created_at", fields: "id,display_id,created_at,total,currency_code,status,payment_status,fulfillment_status,*items" }, await authHeaders())
    .then((r) => r.orders)
    .catch(() => [])
}
