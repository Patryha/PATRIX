import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { recordFulfillmentSales, reverseFulfillmentSales } from "../lib/warehouse-sales"

/** Przesyłka utworzona: sprzedaż z partii (FEFO) w dzienniku magazynu; anulowana: zwrot do partii. */
export default async function warehouseSales({ event, container }: SubscriberArgs<{ fulfillment_id: string }>) {
  if (event.name === "order.fulfillment_canceled") {
    await reverseFulfillmentSales(container, event.data.fulfillment_id)
  } else {
    await recordFulfillmentSales(container, event.data.fulfillment_id)
  }
}

export const config: SubscriberConfig = { event: ["order.fulfillment_created", "order.fulfillment_canceled"] }
