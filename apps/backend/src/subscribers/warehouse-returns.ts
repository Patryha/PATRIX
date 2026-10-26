import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { recordReturnRestock } from "../lib/warehouse-returns"

/** Przyjęty zwrot klienta: ruch „zwrot” w dzienniku i ilość z powrotem w partiach, z których była sprzedaż. */
export default async function warehouseReturns({ event, container }: SubscriberArgs<{ return_id: string }>) {
  await recordReturnRestock(container, event.data.return_id)
}

export const config: SubscriberConfig = { event: "order.return_received" }
