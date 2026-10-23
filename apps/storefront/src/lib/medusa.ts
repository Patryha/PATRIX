import "server-only"
import Medusa from "@medusajs/js-sdk"
import { backendUrl, publishableKey } from "./config"

export const sdk = new Medusa({
  baseUrl: backendUrl,
  publishableKey,
  debug: false,
})
