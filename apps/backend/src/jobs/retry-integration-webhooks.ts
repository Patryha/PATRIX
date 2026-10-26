import type { MedusaContainer } from "@medusajs/framework/types"
import { retryDueWebhooks } from "../lib/integrations"

/** Co minutę ponawia zdarzenia od operatorów, których obsługa wcześniej się nie powiodła. */
export default async function retryIntegrationWebhooksJob(container: MedusaContainer) {
  const retried = await retryDueWebhooks(container)
  if (retried) {
    container.resolve("logger").info(`[patrix] Integracje: ponowiono ${retried} zdarzeń`)
  }
}

export const config = { name: "patrix-retry-integration-webhooks", schedule: "* * * * *" }
